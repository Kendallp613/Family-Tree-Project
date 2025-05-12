if (!localStorage.getItem("user")) {
    window.location.href = "login.html";
  }
  
  let family = {};
  let editingName = null;
  let diagram;
  
  // Declare inputs
  let nameInput, spouseInput, birthYearInput, birthPlaceInput, parentSelect, searchInput;
  
  window.addEventListener('DOMContentLoaded', () => {
    nameInput = document.getElementById("nameInput");
    spouseInput = document.getElementById("spouseInput");
    birthYearInput = document.getElementById("birthYearInput");
    birthPlaceInput = document.getElementById("birthPlaceInput");
    parentSelect = document.getElementById("parentSelect");
    searchInput = document.getElementById("searchInput");
  
    init();
    loadFromLocal();
  });
  
  function init() {
    diagram = new go.Diagram("tree", {
      "undoManager.isEnabled": true,
      layout: new go.TreeLayout({ angle: 90, layerSpacing: 35 }),
      "draggingTool.dragsTree": true
    });
  
    diagram.nodeTemplate =
      new go.Node("Auto")
        .bind("text", "text")
        .add(
          new go.Shape("RoundedRectangle", {
            fill: "lightblue",
            stroke: "#00796b",
            portId: "",
            fromLinkable: true,
            toLinkable: true
          }).bind("fill", "color"),
          new go.TextBlock({
            margin: 8,
            font: "bold 10pt sans-serif",
            stroke: "#333",
            wrap: go.TextBlock.WrapFit,
            width: 140,
            editable: false
          }).bind("text", "text")
        );
  
    diagram.linkTemplate =
      new go.Link({ routing: go.Link.Orthogonal, corner: 5 })
        .add(new go.Shape());
  
    diagram.addDiagramListener("ObjectDoubleClicked", function (e) {
      const name = e.subject.part.data.key;
      editMember(name);
    });
  
    renderTree();
  }
  
  function renderTree() {
    const nodeDataArray = [];
    const linkDataArray = [];
  
    for (const name in family) {
      const m = family[name];
      const spouses = Array.isArray(m.spouses) ? m.spouses.join(', ') : (m.spouse || '');
      const label = `${m.name}${spouses ? ' & ' + spouses : ''}\n${m.birthYear || ''} ${m.birthPlace || ''}\n🌿 View Branch`;
      const color = m.birthYear ? (parseInt(m.birthYear) < 1950 ? "#e1bee7" : "#c8e6c9") : "lightblue";
  
      nodeDataArray.push({
        key: m.name,
        text: label,
        color
      });
  
      m.children.forEach(child => {
        linkDataArray.push({ from: m.name, to: child });
      });
    }
  
    diagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
  
    diagram.nodeTemplate.click = function (e, obj) {
      const node = obj.part;
      const key = node.data.key;
      if (e.diagram.lastInput.sourceElement?.innerText.includes('🌿')) {
        viewBranch(key);
      }
    };
  
    populateParentSelect();
    populateBranchSelect();
    saveToLocal();
  }
  
  function populateParentSelect() {
    parentSelect.innerHTML = '<option value="">No Parent (Root)</option>';
    Object.keys(family).forEach(name => {
      parentSelect.add(new Option(name, name));
    });
  }
  
  function populateBranchSelect() {
    const branchSelect = document.getElementById("branchSelect");
    if (!branchSelect) return;
    branchSelect.innerHTML = '<option value="">Select member...</option>';
    Object.keys(family).forEach(name => {
      branchSelect.add(new Option(name, name));
    });
  }
  
  function launchBranch() {
    const member = document.getElementById("branchSelect").value;
    if (!member || !family[member]) {
      return alert("Please select a valid member to view their branch.");
    }
    viewBranch(member);
  }
  
  function addMember() {
    const name = nameInput.value.trim();
    const spouseRaw = spouseInput.value.trim();
    const spouses = spouseRaw ? spouseRaw.split(',').map(s => s.trim()) : [];
    const birthYear = birthYearInput.value.trim();
    const birthPlace = birthPlaceInput.value.trim();
    const parent = parentSelect.value;
  
    if (!name || family[name]) return alert("Invalid or duplicate name.");
  
    family[name] = { name, spouses, birthYear, birthPlace, children: [] };
    if (parent) family[parent].children.push(name);
  
    clearForm();
    renderTree();
  }
  
  function editMember(name) {
    const m = family[name];
    nameInput.value = m.name;
    spouseInput.value = Array.isArray(m.spouses) ? m.spouses.join(', ') : (m.spouse || '');
    birthYearInput.value = m.birthYear;
    birthPlaceInput.value = m.birthPlace;
    parentSelect.value = Object.entries(family).find(([_, val]) => val.children.includes(name))?.[0] || "";
    nameInput.disabled = false;
    parentSelect.disabled = false;
    document.getElementById('updateBtn').style.display = 'inline';
    editingName = name;
  }
  
  function updateMember() {
    const newName = nameInput.value.trim();
    if (!newName) return alert("Name cannot be empty.");
  
    const m = family[editingName];
    const spouses = spouseInput.value.trim().split(',').map(s => s.trim());
    const birthYear = birthYearInput.value.trim();
    const birthPlace = birthPlaceInput.value.trim();
  
    if (newName !== editingName) {
      if (family[newName]) return alert("A member with this name already exists.");
      family[newName] = { name: newName, spouses, birthYear, birthPlace, children: m.children };
  
      for (const parentName in family) {
        const parent = family[parentName];
        const idx = parent.children.indexOf(editingName);
        if (idx !== -1) parent.children[idx] = newName;
      }
      delete family[editingName];
    } else {
      m.spouses = spouses;
      m.birthYear = birthYear;
      m.birthPlace = birthPlace;
    }
  
    for (const parentName in family) {
      const parent = family[parentName];
      parent.children = parent.children.filter(c => c !== newName);
    }
    const newParent = parentSelect.value;
    if (newParent && family[newParent] && newParent !== newName) {
      family[newParent].children.push(newName);
    }
  
    clearForm();
    renderTree();
  }
  
  function deleteMember(name) {
    if (!confirm(`Delete ${name}?`)) return;
    Object.values(family).forEach(m => m.children = m.children.filter(c => c !== name));
    delete family[name];
    renderTree();
  }
  
  function clearForm() {
    nameInput.value = spouseInput.value = birthYearInput.value = birthPlaceInput.value = '';
    nameInput.disabled = parentSelect.disabled = false;
    document.getElementById('updateBtn').style.display = 'none';
    editingName = null;
  }
  
  function saveToLocal() {
    const user = localStorage.getItem("user");
    if (!user) return;
    localStorage.setItem(`tree_${user}`, JSON.stringify(family));
  }
  
  function loadFromLocal() {
    const user = localStorage.getItem("user");
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    const data = localStorage.getItem(`tree_${user}`);
    if (data) {
      family = JSON.parse(data);
      renderTree();
    }
  }
  
  function clearTree() {
    if (confirm("Clear entire tree?")) {
      family = {};
      diagram.clear();
      const user = localStorage.getItem("user");
      if (user) localStorage.removeItem(`tree_${user}`);
      populateParentSelect();
    }
  }
  
  function downloadJSON() {
    const blob = new Blob([JSON.stringify(family, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'family_tree.json';
    link.click();
  }
  
  function downloadCSV() {
    const rows = [['Name', 'Spouses', 'Year Born', 'Place Born', 'Children']];
    for (const name in family) {
      const m = family[name];
      rows.push([m.name, Array.isArray(m.spouses) ? m.spouses.join('|') : '', m.birthYear, m.birthPlace, m.children.join('|')]);
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'family_tree.csv';
    link.click();
  }
  
  function viewBranch(memberName) {
    if (!family[memberName]) return alert("Member not found.");
    localStorage.setItem("branchRoot", memberName);
    saveToLocal();
    window.open("branch.html?member=" + encodeURIComponent(memberName), "_blank");
  }
  
  function searchMember() {
    const query = searchInput.value.trim().toLowerCase();
    diagram.clearHighlighteds();
    diagram.findNodesByExample({}).each(node => {
      if (node.data.text.toLowerCase().includes(query)) {
        diagram.select(node);
        diagram.centerRect(node.actualBounds);
      }
    });
  }
  
  function exportAsPNG() {
    html2canvas(document.getElementById("tree")).then(canvas => {
      const link = document.createElement('a');
      link.download = 'family_tree.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }
  
  function signOut() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
  }
  