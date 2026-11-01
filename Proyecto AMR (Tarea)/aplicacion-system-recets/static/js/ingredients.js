(() => {
  const rows = document.querySelector("#ingredient-rows");
  const template = document.querySelector("#empty-ingredient-row");
  const addButton = document.querySelector("#add-ingredient");
  const totalForms = document.querySelector("#id_ingredients-TOTAL_FORMS");
  if (!rows || !template || !addButton || !totalForms) return;

  const addRow = () => {
    const index = Number(totalForms.value);
    const fragment = template.content.cloneNode(true);
    fragment.querySelectorAll("[name], [id], [for]").forEach((element) => {
      for (const attribute of ["name", "id", "for"]) {
        if (element.hasAttribute(attribute)) {
          element.setAttribute(attribute, element.getAttribute(attribute).replace(/__prefix__/g, index));
        }
      }
    });
    rows.append(fragment);
    totalForms.value = index + 1;
    rows.lastElementChild.querySelector("input[name$='-name']")?.focus();
  };

  rows.addEventListener("click", (event) => {
    const button = event.target.closest(".remove-ingredient");
    if (!button) return;
    const row = button.closest("[data-ingredient-row]");
    const deleteField = row.querySelector("input[type='checkbox'][name$='-DELETE']");
    if (deleteField) {
      deleteField.checked = true;
      row.hidden = true;
    } else {
      row.remove();
    }
  });
  addButton.addEventListener("click", addRow);
})();
