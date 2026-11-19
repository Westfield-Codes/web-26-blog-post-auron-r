const STORAGE_KEY = "my-assignments.assignments.v1";
const CATEGORY_TAG_LABELS = {
  PR: "Project",
  TE: "Test",
  Ma: "Major assignment",
};

const form = document.querySelector("#assignment-form");
const assignmentIdInput = document.querySelector("#assignment-id");
const formHeading = document.querySelector("#form-heading");
const titleInput = document.querySelector("#title");
const courseInput = document.querySelector("#course");
const dueDateInput = document.querySelector("#due-date");
const pointsInput = document.querySelector("#points");
const notesInput = document.querySelector("#notes");
const linksInput = document.querySelector("#links");
const tagInput = document.querySelector("#tag");
const categoryTagInputs = [...document.querySelectorAll("input[name='categoryTags']")];
const saveButton = document.querySelector("#save-button");
const cancelEditButton = document.querySelector("#cancel-edit");
const toggleFormButton = document.querySelector("#toggle-form");
const formPanel = document.querySelector("#assignment-form-panel");
const classTabs = document.querySelector("#class-tabs");
const classPanel = document.querySelector("#class-panel");
const updatesToggle = document.querySelector("#updates-toggle");
const updatesPanel = document.querySelector("#updates-panel");
const notificationCount = document.querySelector("#notification-count");
const assignmentList = document.querySelector("#assignment-list");
const reminderList = document.querySelector("#reminder-list");
const reminderEmpty = document.querySelector("#reminder-empty");
const assignmentCount = document.querySelector("#assignment-count");
const emptyState = document.querySelector("#empty-state");
const status = document.querySelector("#status");
const exportButton = document.querySelector("#export-button");
const importButton = document.querySelector("#import-button");
const importFile = document.querySelector("#import-file");

let assignments = [];
let selectedCourse = null;
let storageReady = true;

try {
  const savedAssignments = localStorage.getItem(STORAGE_KEY);
  if (savedAssignments !== null) {
    assignments = validateAssignments(JSON.parse(savedAssignments));
  }
  renderAssignments();
} catch (error) {
  storageReady = false;
  showStatus(`Could not load saved assignments: ${error.message}`, true);
}
exportButton.disabled = !storageReady;

toggleFormButton.addEventListener("click", () => {
  setFormOpen(formPanel.hidden);
  if (!formPanel.hidden) titleInput.focus();
});

updatesToggle.addEventListener("click", () => {
  setUpdatesOpen(updatesPanel.hidden);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || updatesPanel.hidden) return;
  setUpdatesOpen(false);
  updatesToggle.focus();
});

document.addEventListener("click", (event) => {
  if (
    updatesPanel.hidden ||
    updatesPanel.contains(event.target) ||
    updatesToggle.contains(event.target)
  ) {
    return;
  }
  setUpdatesOpen(false);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!storageReady) {
    showStatus("Storage is unavailable. Restore a backup before making changes.", true);
    return;
  }

  const title = titleInput.value.trim();
  if (!title) {
    showStatus("Enter an assignment name.", true);
    titleInput.focus();
    return;
  }

  const points = pointsInput.value === "" ? "" : Number(pointsInput.value);
  if (points !== "" && (!Number.isFinite(points) || points < 0)) {
    showStatus("Points must be a non-negative number.", true);
    pointsInput.focus();
    return;
  }

  let links;
  try {
    links = parseLinks(linksInput.value);
  } catch (error) {
    showStatus(error.message, true);
    linksInput.focus();
    return;
  }

  const id = assignmentIdInput.value;
  const assignment = {
    id: id || createId(),
    title,
    course: courseInput.value.trim(),
    dueDate: dueDateInput.value,
    points,
    notes: notesInput.value.trim(),
    links,
    tag: tagInput.value,
    categoryTags: categoryTagInputs.filter((input) => input.checked).map((input) => input.value),
  };
  selectedCourse = assignment.course;
  const updatedAssignments = id
    ? assignments.map((item) => item.id === id ? assignment : item)
    : [...assignments, assignment];

  if (saveAssignments(updatedAssignments)) {
    form.reset();
    assignmentIdInput.value = "";
    saveButton.textContent = "Add assignment";
    cancelEditButton.hidden = true;
    formHeading.textContent = "Add an assignment";
    setFormOpen(false);
    showStatus(id ? "Assignment updated." : "Assignment added.");
  }
});

cancelEditButton.addEventListener("click", () => {
  form.reset();
  assignmentIdInput.value = "";
  saveButton.textContent = "Add assignment";
  cancelEditButton.hidden = true;
  formHeading.textContent = "Add an assignment";
  setFormOpen(false);
  toggleFormButton.focus();
});

assignmentList.addEventListener("click", (event) => {
  const summaryButton = event.target.closest("button.assignment-summary");
  if (summaryButton) {
    const expanded = summaryButton.getAttribute("aria-expanded") === "true";
    summaryButton.setAttribute("aria-expanded", String(!expanded));
    document.getElementById(summaryButton.getAttribute("aria-controls")).hidden = expanded;
    return;
  }

  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const assignment = assignments.find((item) => item.id === button.dataset.id);
  if (!assignment) return;

  if (button.dataset.action === "edit") {
    assignmentIdInput.value = assignment.id;
    titleInput.value = assignment.title;
    courseInput.value = assignment.course;
    dueDateInput.value = assignment.dueDate;
    pointsInput.value = assignment.points === "" ? "" : String(assignment.points);
    notesInput.value = assignment.notes;
    linksInput.value = assignment.links.join("\n");
    tagInput.value = getEffectiveStatus(assignment);
    for (const input of categoryTagInputs) {
      input.checked = assignment.categoryTags.includes(input.value);
    }
    saveButton.textContent = "Save changes";
    cancelEditButton.hidden = false;
    formHeading.textContent = "Edit assignment";
    setFormOpen(true);
    titleInput.focus();
    return;
  }

  if (button.dataset.action === "delete") {
    const confirmed = window.confirm(`Delete "${assignment.title}"?`);
    if (!confirmed) return;

    if (saveAssignments(assignments.filter((item) => item.id !== assignment.id))) {
      showStatus("Assignment deleted.");
      if (assignmentIdInput.value === assignment.id) {
        form.reset();
        assignmentIdInput.value = "";
        saveButton.textContent = "Add assignment";
        cancelEditButton.hidden = true;
        formHeading.textContent = "Add an assignment";
        setFormOpen(false);
      }
    }
  }
});

exportButton.addEventListener("click", () => {
  try {
    const exportAssignments = assignments
      .filter((assignment) => assignment.tag !== "TI")
      .map((assignment) => ({
        ...assignment,
        tag: getEffectiveStatus(assignment),
      }));
    const backup = new Blob([JSON.stringify(exportAssignments, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(backup);
    const link = document.createElement("a");
    link.href = url;
    link.download = `assignments-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showStatus("Backup downloaded. Turned-in assignments are excluded.");
  } catch (error) {
    showStatus(`Could not create a backup: ${error.message}`, true);
  }
});

importButton.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", async () => {
  const file = importFile.files[0];
  if (!file) return;

  try {
    const imported = validateAssignments(JSON.parse(await file.text()));
    if (!window.confirm("Restore this backup? It will replace assignments saved here.")) {
      return;
    }
    if (saveAssignments(imported)) {
      form.reset();
      assignmentIdInput.value = "";
      saveButton.textContent = "Add assignment";
      cancelEditButton.hidden = true;
      formHeading.textContent = "Add an assignment";
      setFormOpen(false);
      showStatus(`Restored ${imported.length} assignment${imported.length === 1 ? "" : "s"}.`);
    }
  } catch (error) {
    showStatus(`Could not restore the backup: ${error.message}`, true);
  } finally {
    importFile.value = "";
  }
});

function saveAssignments(nextAssignments) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAssignments));
    assignments = nextAssignments;
    storageReady = true;
    exportButton.disabled = false;
    renderAssignments();
    return true;
  } catch (error) {
    showStatus(`Could not save assignments: ${error.message}`, true);
    return false;
  }
}

function validateAssignments(value) {
  if (!Array.isArray(value)) {
    throw new Error("The backup must contain a list of assignments.");
  }

  const ids = new Set();
  for (const item of value) {
    if (
      !item ||
      typeof item.id !== "string" ||
      !item.id ||
      ids.has(item.id) ||
      typeof item.title !== "string" ||
      !item.title.trim() ||
      typeof item.course !== "string" ||
      typeof item.dueDate !== "string" ||
      (item.dueDate !== "" && !isValidDate(item.dueDate)) ||
      (item.points !== undefined &&
        item.points !== "" &&
        (typeof item.points !== "number" || !Number.isFinite(item.points) || item.points < 0)) ||
      typeof item.notes !== "string" ||
      (item.links !== undefined &&
        (!Array.isArray(item.links) || item.links.some((link) => typeof link !== "string" || !isValidLink(link)))) ||
      (item.categoryTags !== undefined &&
        (!Array.isArray(item.categoryTags) ||
          new Set(item.categoryTags).size !== item.categoryTags.length ||
          item.categoryTags.some((tag) => !["PR", "TE", "Ma"].includes(tag)))) ||
      (item.tag !== undefined && !["UN", "TI", "LA"].includes(item.tag))
    ) {
      throw new Error("The saved data is invalid or damaged.");
    }
    ids.add(item.id);
  }
  return value.map((item) => ({
    ...item,
    points: item.points ?? "",
    links: item.links ?? [],
    tag: item.tag ?? "UN",
    categoryTags: item.categoryTags ?? [],
  }));
}

function renderAssignments() {
  classTabs.replaceChildren();
  assignmentList.replaceChildren();
  const sortedAssignments = [...assignments].sort((a, b) => {
    if (!a.dueDate) return b.dueDate ? 1 : a.title.localeCompare(b.title);
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate) ||
      a.title.localeCompare(b.title);
  });

  const classes = new Map();
  for (const assignment of sortedAssignments) {
    const course = assignment.course.trim();
    if (!classes.has(course)) classes.set(course, []);
    classes.get(course).push(assignment);
  }

  const sortedCourses = [...classes.keys()].sort((a, b) =>
    (a || "No class").localeCompare(b || "No class")
  );
  if (!sortedCourses.includes(selectedCourse)) {
    selectedCourse = sortedCourses[0] ?? null;
  }

  sortedCourses.forEach((course, index) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "class-tab";
    tab.id = `class-tab-${index}`;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", "class-panel");
    tab.setAttribute("aria-selected", String(course === selectedCourse));
    tab.tabIndex = course === selectedCourse ? 0 : -1;
    tab.dataset.course = course;
    tab.textContent = course || "No class";
    classTabs.append(tab);
  });

  const selectedTab = [...classTabs.children].find(
    (tab) => tab.dataset.course === selectedCourse,
  );
  if (selectedTab) {
    classPanel.setAttribute("aria-labelledby", selectedTab.id);
    for (const [index, assignment] of classes.get(selectedCourse).entries()) {
      assignmentList.append(createAssignmentRows(assignment, index));
    }
  }

  const count = assignments.length;
  assignmentCount.textContent = `${count} assignment${count === 1 ? "" : "s"}`;
  emptyState.hidden = count > 0;
  classTabs.hidden = count === 0;
  classPanel.hidden = count === 0;
  renderReminders();
}

classTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("button[role='tab']");
  if (!tab || tab.dataset.course === selectedCourse) return;

  selectedCourse = tab.dataset.course;
  renderAssignments();
  classTabs.querySelector("[aria-selected='true']").focus();
});

classTabs.addEventListener("keydown", (event) => {
  const tabs = [...classTabs.querySelectorAll("button[role='tab']")];
  const currentIndex = tabs.indexOf(event.target);
  if (currentIndex < 0) return;

  let nextIndex;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = tabs.length - 1;
  else return;

  event.preventDefault();
  selectedCourse = tabs[nextIndex].dataset.course;
  renderAssignments();
  classTabs.querySelector("[aria-selected='true']").focus();
});

function createAssignmentRows(assignment, index) {
  const item = document.createElement("li");
  item.className = `assignment${assignment.tag === "TI" ? " is-turned-in" : ""}`;

  const summary = document.createElement("button");
  summary.type = "button";
  summary.className = "assignment-summary";
  summary.setAttribute("aria-expanded", "false");
  summary.setAttribute("aria-controls", `assignment-details-${index}`);

  const title = document.createElement("span");
  title.className = "assignment-summary-title";
  title.textContent = assignment.title;

  const summaryMeta = document.createElement("span");
  summaryMeta.className = "assignment-summary-meta";
  const dueDate = document.createElement("span");
  dueDate.textContent = assignment.dueDate ? formatDate(assignment.dueDate) : "No due date";
  summaryMeta.append(dueDate, createStatusTag(getEffectiveStatus(assignment)));
  for (const tag of assignment.categoryTags) {
    summaryMeta.append(createCategoryTag(tag));
  }
  summary.append(title, summaryMeta);

  const details = document.createElement("div");
  details.id = `assignment-details-${index}`;
  details.className = "assignment-details";
  details.hidden = true;

  const rows = document.createElement("dl");
  rows.className = "assignment-rows";
  appendAssignmentRow(rows, "Assignment", assignment.title);
  appendAssignmentRow(
    rows,
    "Due date",
    assignment.dueDate ? formatDate(assignment.dueDate) : "Not set",
  );

  appendAssignmentRow(rows, "Status", createStatusTag(getEffectiveStatus(assignment)));

  const categoryTags = document.createElement("div");
  categoryTags.className = "category-tag-list";
  for (const tag of assignment.categoryTags) {
    categoryTags.append(createCategoryTag(tag));
  }
  appendAssignmentRow(rows, "Tags", categoryTags.childElementCount ? categoryTags : "None");

  const links = document.createElement("ul");
  links.className = "assignment-link-list";
  for (const href of assignment.links) {
    const linkItem = document.createElement("li");
    const link = document.createElement("a");
    link.href = href;
    link.textContent = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    linkItem.append(link);
    links.append(linkItem);
  }
  appendAssignmentRow(rows, "Links", links.childElementCount ? links : "None");
  appendAssignmentRow(rows, "Other notes", assignment.notes || "None");
  appendAssignmentRow(
    rows,
    "Points",
    assignment.points === ""
      ? "Not set"
      : `${assignment.points} point${assignment.points === 1 ? "" : "s"}`,
  );

  const actions = document.createElement("div");
  actions.className = "assignment-actions";
  actions.append(
    createActionButton("Edit", "edit", assignment.id),
    createActionButton("Delete", "delete", assignment.id),
  );
  details.append(rows, actions);
  item.append(summary, details);
  return item;
}

function renderReminders() {
  reminderList.replaceChildren();
  const reminders = assignments
    .filter((assignment) => assignment.tag !== "TI" && assignment.dueDate)
    .map((assignment) => ({
      assignment,
      daysUntilDue: getDaysUntilDue(assignment.dueDate),
    }))
    .filter(({ daysUntilDue }) => daysUntilDue <= 5)
    .sort((a, b) =>
      a.daysUntilDue - b.daysUntilDue ||
      a.assignment.title.localeCompare(b.assignment.title)
    );

  notificationCount.textContent = String(reminders.length);
  setUpdatesOpen(!updatesPanel.hidden);

  for (const { assignment, daysUntilDue } of reminders) {
    const item = document.createElement("li");
    item.className = `reminder-item${daysUntilDue < 2 ? " is-urgent" : ""}`;

    const title = document.createElement("strong");
    title.className = "reminder-title";
    title.textContent = assignment.title;

    const details = document.createElement("p");
    details.className = "reminder-meta";
    details.textContent = `${assignment.course || "No class"} · ${reminderDueText(daysUntilDue)}`;

    const tags = document.createElement("div");
    tags.className = "category-tag-list";
    tags.append(createStatusTag(getEffectiveStatus(assignment)));
    for (const tag of assignment.categoryTags) {
      tags.append(createCategoryTag(tag));
    }

    item.append(title, details, tags);
    reminderList.append(item);
  }

  reminderEmpty.hidden = reminders.length > 0;
}

function setUpdatesOpen(isOpen) {
  updatesPanel.hidden = !isOpen;
  updatesToggle.setAttribute("aria-expanded", String(isOpen));
  const count = Number(notificationCount.textContent);
  updatesToggle.setAttribute(
    "aria-label",
    `${isOpen ? "Close" : "Open"} updates, ${count} notification${count === 1 ? "" : "s"}`,
  );
}

function createStatusTag(statusValue) {
  const tag = document.createElement("span");
  tag.className = `assignment-tag tag-${statusValue.toLowerCase()}`;
  tag.textContent = statusValue;
  tag.title = { UN: "Unstarted", TI: "Turned in", LA: "Late" }[statusValue];
  tag.setAttribute("aria-label", `Status: ${tag.title}`);
  return tag;
}

function createCategoryTag(value) {
  const tag = document.createElement("span");
  tag.className = "category-tag";
  tag.textContent = `${value} — ${CATEGORY_TAG_LABELS[value]}`;
  return tag;
}

function getEffectiveStatus(assignment) {
  if (
    assignment.tag !== "TI" &&
    assignment.dueDate &&
    getDaysUntilDue(assignment.dueDate) < 0
  ) {
    return "LA";
  }
  return assignment.tag;
}

function getDaysUntilDue(value) {
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = Date.parse(`${value}T00:00:00Z`);
  return Math.round((dueDate - today) / 86400000);
}

function reminderDueText(daysUntilDue) {
  if (daysUntilDue < 0) {
    const daysLate = Math.abs(daysUntilDue);
    return `Overdue by ${daysLate} day${daysLate === 1 ? "" : "s"}`;
  }
  if (daysUntilDue === 0) return "Due today";
  if (daysUntilDue === 1) return "Due tomorrow";
  return `Due in ${daysUntilDue} days`;
}

function appendAssignmentRow(rows, label, value) {
  const row = document.createElement("div");
  row.className = "assignment-row";

  const heading = document.createElement("dt");
  heading.textContent = label;
  const detail = document.createElement("dd");
  if (typeof value === "string") {
    detail.textContent = value;
  } else {
    detail.append(value);
  }
  row.append(heading, detail);
  rows.append(row);
}

function createActionButton(label, action, id) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = action === "delete" ? "text-button delete-button" : "text-button";
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.id = id;
  return button;
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseLinks(value) {
  const links = value.split("\n").map((link) => link.trim()).filter(Boolean);
  if (links.some((link) => !isValidLink(link))) {
    throw new Error("Enter valid http or https URLs in the Links section.");
  }
  return links;
}

function isValidLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function setFormOpen(isOpen) {
  formPanel.hidden = !isOpen;
  toggleFormButton.setAttribute("aria-expanded", String(isOpen));
  toggleFormButton.textContent = isOpen ? "Close form" : "Add assignment";
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.dataset.state = isError ? "error" : "success";
}
