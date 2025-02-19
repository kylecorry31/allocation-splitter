const people = [];
const workItems = [];

function getRandomColor() {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  );
}

function getMostContrastingColor(hexcolor) {
  const r = parseInt(hexcolor.slice(1, 3), 16);
  const g = parseInt(hexcolor.slice(3, 5), 16);
  const b = parseInt(hexcolor.slice(5, 7), 16);
  const valueIndex = (r * 299 + g * 587 + b * 114) / 1000;
  return valueIndex >= 128 ? "black" : "white";
}

function assignWorkItems(people, sprintDays, workItems) {
  // Build assignment objects for each person
  let assignments = people.map((person) => {
    const cap = Math.min(person.availableDays, sprintDays);
    return {
      person: person.name,
      tasks: [],
      capacity: cap,
      freeCapacity: cap,
    };
  });

  // Sort tasks by descending order (largest first)
  let tasksSorted = [...workItems].sort((a, b) => {
    // Sort assigned tasks first
    if (a.assignTo && !b.assignTo) return -1;
    if (!a.assignTo && b.assignTo) return 1;
    // Then sort by days
    return b.days - a.days;
  });
  let unallocated = [];

  tasksSorted.forEach((task) => {
    // Determine valid assignees if assignTo is provided
    let validAssignees = null;
    if (task.assignTo != null && task.assignTo !== "") {
      validAssignees = task.assignTo.split(",").map((s) => s.trim());
    }
    // Sort assignments by freeCapacity descending
    assignments.sort((a, b) => b.freeCapacity - a.freeCapacity);
    let assigned = false;
    for (let assign of assignments) {
      // If task.assignTo is set, only assign if current person is in that list
      if (validAssignees && !validAssignees.includes(assign.person)) {
        continue;
      }
      if (assign.freeCapacity >= task.days) {
        assign.tasks.push(task);
        assign.freeCapacity -= task.days;
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      unallocated.push(task);
    }
  });

  return { assignments, unallocated };
}

function updateAssignments() {
  // Clear current displays
  document.getElementById("allocations").innerHTML = "";
  document.getElementById("work-items").innerHTML = "";
  document.getElementById("unallocated-list").innerHTML = "";

  const sprintDays = parseInt(document.getElementById("sprint-days").value);
  if (!sprintDays) return;

  const result = assignWorkItems(people, sprintDays, workItems);
  const assignments = result.assignments;
  const unallocated = result.unallocated;

  // Build chart for each person
  assignments.forEach((assignment) => {
    const { person, tasks, capacity, freeCapacity } = assignment;
    const allocatedDays = capacity - freeCapacity;

    const personElement = document.createElement("div");
    personElement.classList.add("person");

    // Header with person name, capacity info, and a remove button (X)
    const headerDiv = document.createElement("div");
    headerDiv.classList.add("person-header");
    const header = document.createElement("h3");
    header.textContent = `${person} (Capacity: ${capacity} days, Allocated: ${allocatedDays} days)`;
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "X";
    removeBtn.classList.add("remove-btn");
    removeBtn.onclick = () => removePerson(person);
    headerDiv.appendChild(header);
    headerDiv.appendChild(removeBtn);
    personElement.appendChild(headerDiv);

    // Chart container for this person's allocation
    const chart = document.createElement("div");
    chart.classList.add("chart");
    tasks.forEach((task) => {
      const taskBlock = document.createElement("div");
      taskBlock.classList.add("task-block");
      taskBlock.style.backgroundColor = task.color;
      taskBlock.style.color = getMostContrastingColor(task.color);
      const widthPercentage = (task.days / capacity) * 100;
      taskBlock.style.width = widthPercentage + "%";
      taskBlock.title = `${task.description} (${task.days} days)`;
      taskBlock.textContent = task.description;
      chart.appendChild(taskBlock);
    });
    // Unallocated capacity block (if any)
    if (freeCapacity > 0) {
      const freeBlock = document.createElement("div");
      freeBlock.classList.add("free-block");
      const widthPercentage = (freeCapacity / capacity) * 100;
      freeBlock.style.width = widthPercentage + "%";
      freeBlock.title = `Unallocated (${freeCapacity} days)`;
      chart.appendChild(freeBlock);
    }
    personElement.appendChild(chart);
    document.getElementById("allocations").appendChild(personElement);
  });

  // Display unallocated work items below the allocations
  unallocated.forEach((task) => {
    const li = document.createElement("li");
    li.style.color = task.color;
    li.textContent =
      `${task.description} (${task.days} days)` +
      (task.assignTo ? ` [Assigned to: ${task.assignTo}]` : "");
    document.getElementById("unallocated-list").appendChild(li);
  });

  // Update the work items list with remove buttons (X)
  workItems.forEach((workItem) => {
    const workItemElement = document.createElement("div");
    workItemElement.classList.add("work-item");
    workItemElement.innerHTML =
      `<span><strong>${workItem.description}</strong> (${workItem.days} days)` +
      (workItem.assignTo ? ` [Assigned to: ${workItem.assignTo}]` : "") +
      `</span>
<button class="remove-btn" onclick="removeWorkItem('${workItem.description}')">X</button>`;
    document.getElementById("work-items").appendChild(workItemElement);
  });

  // Update the assignee dropdown options
  const workAssignedSelect = document.getElementById("work-assigned");
  workAssignedSelect.innerHTML = "";
  people.forEach((person) => {
    const option = document.createElement("option");
    option.value = person.name;
    option.textContent = person.name;
    workAssignedSelect.appendChild(option);
  });

  // Save current data to local storage (including sprint days)
  saveData();
}

function addPerson() {
  const name = document.getElementById("person-name").value.trim();
  const availableDays = parseInt(document.getElementById("person-days").value);
  if (!name || isNaN(availableDays)) return;
  // Clear input fields
  document.getElementById("person-name").value = "";
  document.getElementById("person-days").value = "";
  const person = { name, availableDays };
  people.push(person);
  updateAssignments();
}

function addWorkItem() {
  const description = document.getElementById("work-name").value.trim();
  const days = parseInt(document.getElementById("work-days").value);
  let assignTo = [...document.getElementById("work-assigned").selectedOptions]
    .map((it) => it.value)
    .join(",");
  if (!description || isNaN(days)) return;

  if (assignTo === "") {
    assignTo = null;
  }

  // Clear input fields
  document.getElementById("work-name").value = "";
  document.getElementById("work-days").value = "";
  document.getElementById("work-assigned").value = "";
  const workItem = { description, days, color: getRandomColor(), assignTo };
  workItems.push(workItem);
  updateAssignments();
}

function removePerson(personName) {
  const index = people.findIndex((person) => person.name === personName);
  if (index !== -1) {
    people.splice(index, 1);
    updateAssignments();
  }
}

function removeWorkItem(workItemDescription) {
  const index = workItems.findIndex(
    (workItem) => workItem.description === workItemDescription,
  );
  if (index !== -1) {
    workItems.splice(index, 1);
    updateAssignments();
  }
}

function clearAll() {
  people.length = 0;
  workItems.length = 0;
  document.getElementById("person-name").value = "";
  document.getElementById("person-days").value = "";
  document.getElementById("work-name").value = "";
  document.getElementById("work-days").value = "";
  document.getElementById("sprint-days").value = "";
  document.getElementById("work-assigned").value = "";
  updateAssignments();
  localStorage.removeItem("people");
  localStorage.removeItem("workItems");
  localStorage.removeItem("sprintDays");
}

function saveData() {
  localStorage.setItem("people", JSON.stringify(people));
  localStorage.setItem("workItems", JSON.stringify(workItems));
  localStorage.setItem(
    "sprintDays",
    document.getElementById("sprint-days").value,
  );
}

function loadData() {
  const storedPeople = localStorage.getItem("people");
  const storedWorkItems = localStorage.getItem("workItems");
  const storedSprintDays = localStorage.getItem("sprintDays");
  if (storedPeople) {
    const parsedPeople = JSON.parse(storedPeople);
    people.length = 0;
    parsedPeople.forEach((p) => people.push(p));
  }
  if (storedWorkItems) {
    const parsedWorkItems = JSON.parse(storedWorkItems);
    workItems.length = 0;
    parsedWorkItems.forEach((w) => workItems.push(w));
  }
  if (storedSprintDays) {
    document.getElementById("sprint-days").value = storedSprintDays;
  }
  updateAssignments();
}

window.onload = loadData;
