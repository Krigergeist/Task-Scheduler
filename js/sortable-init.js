// Simple SortableJS loader for Repeat Alarm
// https://sortablejs.github.io/Sortable/
(function () {
  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js";
  s.onload = function () {
    var taskList = document.getElementById("taskList");
    if (!taskList) return;
    new Sortable(taskList, {
      animation: 150,
      handle: ".task-item",
      onEnd: function (evt) {
        if (typeof window.tasks !== "object") return;
        const oldIndex = evt.oldIndex;
        const newIndex = evt.newIndex;
        if (oldIndex === newIndex) return;
        // Move the task in the array
        const moved = window.tasks.splice(oldIndex, 1)[0];
        window.tasks.splice(newIndex, 0, moved);
        // Re-render to update ids and buttons
        if (typeof window.renderTaskList === "function")
          window.renderTaskList();
      },
    });
  };
  document.body.appendChild(s);
})();
