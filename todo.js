class Todo {
    constructor(options) {
        this.tasks = [];
        this.term = "";
        this.storageKey = "lab-b-todo-tasks";

        this.listElement = options.listElement;
        this.searchInput = options.searchInput;
        this.newTextInput = options.newTextInput;
        this.newDateInput = options.newDateInput;
        this.addButton = options.addButton;

        this.loadFromStorage();
        this.attachEvents();
        this.draw();
    }
    attachEvents() {
        this.addButton.addEventListener("click", () => this.handleAdd());
        this.newTextInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.handleAdd();
        });
        this.searchInput.addEventListener("input", () => {
            this.term = this.searchInput.value.trim();
            this.draw();
        });

        // глобальный клик для завершения редактирования
        document.addEventListener("click", (event) => {
            if (!this.editingId || !this.currentEditElements) return;
            const { li } = this.currentEditElements;
            if (!li.contains(event.target)) {
                this.finishEdit();
            }
        });
    }

    handleAdd() {
        const text = this.newTextInput.value.trim();
        const dateValue = this.newDateInput.value;
        if (text.length < 3) {
            alert("Min 3 znaki");
            return;
        }
        if (text.length > 255) {
            alert("Max 255 znaków");
            return;
        }

        // walidacja daty
        if (dateValue) {
            const now = new Date();
            const deadline = new Date(dateValue);
            if (isNaN(deadline.getTime()) || deadline <= now) {
                alert("Data musi być pusta albo w przyszłości");
                return;
            }
        }
        const task = {
            id: Date.now(),
            text,
            deadline: dateValue || ""
        };
        this.tasks.push(task);
        this.saveToStorage();
        this.newTextInput.value = "";
        this.newDateInput.value = "";
        this.newTextInput.focus();

        this.draw();
    }
    deleteTask(id) {
        this.tasks = this.tasks.filter((t) => t.id !== id);
        if (this.editingId === id) {
            this.editingId = null;
            this.currentEditElements = null;
        }
        this.saveToStorage();
        this.draw();
    }
    editTask(task) {
        const oldText = task.text;
        const oldDate = task.deadline || "";

        const newText = prompt("Edytuj treść zadania:", oldText);
        if (newText === null) {
            return;
        }
        const textTrim = newText.trim();
        if (textTrim.length < 3 || textTrim.length > 255) {
            alert("3–255 znaków");
            return;
        }
        const newDate = prompt(
            "Edytuj termin (format: RRRR-MM-DD GG:MM) lub zostaw puste:",
            oldDate ? oldDate.replace("T", " ").slice(0, 16) : ""
        );
        if (newDate === null) {
            return; // Anuluj
        }

        let finalDate = "";
        if (newDate.trim() !== "") {
            const normalized = newDate.trim().replace(" ", "T");
            const deadline = new Date(normalized);
            const now = new Date();
            if (isNaN(deadline.getTime()) || deadline <= now) {
                alert("Po edycji data musi być pusta albo w przyszłości");
                return;
            }
            finalDate = normalized;
        }

        task.text = textTrim;
        task.deadline = finalDate;

        this.saveToStorage();
        this.draw();
    }

    startEdit(task, liElement) {
        this.editingId = task.id;
        this.currentEditElements = null; // будет ustawione в draw()
        this.draw(); // перерисуем, чтобы li стало в режиме редактирования
    }
    finishEdit() {
        if (!this.editingId || !this.currentEditElements) return;

        const { textInput, dateInput } = this.currentEditElements;
        const newText = textInput.value.trim();
        const newDate = dateInput.value;

        if (newText.length < 3 || newText.length > 255) {
            alert("3–255 znaków");
            return;
        }

        if (newDate) {
            const now = new Date();
            const deadline = new Date(newDate);
            if (isNaN(deadline.getTime()) || deadline <= now) {
                alert("Po edycji data musi być pusta albo w przyszłości");
                return;
            }
        }
        const task = this.tasks.find((t) => t.id === this.editingId);
        if (task) {
            task.text = newText;
            task.deadline = newDate || "";
        }
        this.editingId = null;
        this.currentEditElements = null;
        this.saveToStorage();
        this.draw();
    }
    get filteredTasks() {
        const term = this.term.toLowerCase();
        if (term.length < 2) return this.tasks;

        return this.tasks.filter((t) =>
            t.text.toLowerCase().includes(term)
        );
    }
    highlight(text) {
        const term = this.term.trim();
        if (!term || term.length < 2) return text;
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`(${escaped})`, "gi");
        return text.replace(re, "<mark>$1</mark>");
    }
    formatDate(deadline) {
        if (!deadline) return "";
        try {
            const d = new Date(deadline);
            if (isNaN(d.getTime())) return "";
            return d.toLocaleString("pl-PL");
        } catch {
            return "";
        }
    }
    draw() {
        this.listElement.innerHTML = "";

        const tasks = this.filteredTasks;

        tasks.forEach((task) => {
            const li = document.createElement("li");
            li.className = "todo-item";
            li.dataset.id = String(task.id);

            const mainDiv = document.createElement("div");
            mainDiv.className = "todo-main";

            const textSpan = document.createElement("span");
            textSpan.className = "todo-text";
            textSpan.innerHTML = this.highlight(task.text);

            const dateDiv = document.createElement("div");
            dateDiv.className = "todo-date";
            const formatted = this.formatDate(task.deadline);
            dateDiv.textContent = formatted ? `Termin: ${formatted}` : "";

            mainDiv.appendChild(textSpan);
            mainDiv.appendChild(dateDiv);

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "todo-delete";
            deleteBtn.textContent = "Usuń";

            deleteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.deleteTask(task.id);
            });

            li.appendChild(mainDiv);
            li.appendChild(deleteBtn);

            li.addEventListener("click", () => this.editTask(task));

            this.listElement.appendChild(li);
        });
    }
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.tasks));
        } catch (e) {
            console.error("Error", e);
        }
    }
    loadFromStorage() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                this.tasks = parsed.map((t) => ({
                    id: t.id,
                    text: t.text,
                    deadline: t.deadline || ""
                }));
            }
        } catch (e) {
            console.warn("Error", e);
        }
    }
}
window.addEventListener("DOMContentLoaded", () => {
    const todo = new Todo({
        listElement: document.getElementById("todo-list"),
        searchInput: document.getElementById("search"),
        newTextInput: document.getElementById("new-task-text"),
        newDateInput: document.getElementById("new-task-date"),
        addButton: document.getElementById("add-task")
    });
    window.todoApp = todo;
});