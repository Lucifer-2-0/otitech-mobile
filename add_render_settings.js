const fs = require('fs');
const path = 'C:\\Users\\workstation\\Desktop\\otitech\\admin\\js\\admin.js';
let content = fs.readFileSync(path, 'utf8');

// Find the position after the first '};' that comes before 'document.querySelector'
const insertMarker = '};\\n\\ndocument.querySelector';
const index = content.indexOf(insertMarker);
if (index === -1) {
    console.log('Marker not found');
    process.exit(1);
}

// Insert after the first '};'
const insertPos = index + 2; // after '};'
const newFunction = '\n\nconst renderSettings = async () => {\n    const mainEl = getMain();\n    if (!mainEl) return;\n    try {\n        const response = await settingsApi.list();\n        const settings = response.data || [];\n        mainEl.innerHTML = `\n            <section class="admin-page-toolbar"><div><p class="admin-eyebrow">PUBLIC CONTACT DETAILS</p><h2>Site settings</h2><p>Update the contact values used across the public website.</p></div></section>\n            <section class="admin-settings-list">${settings.length ? settings.map((setting) => `\n                <form class="admin-setting-row" data-setting-form="${escapeHtml(setting.key)}"><div><h3>${escapeHtml(pretty(setting.key))}</h3><p>${escapeHtml(setting.description || setting.key)}</p></div><label class="admin-field"><span class="visually-hidden">${escapeHtml(pretty(setting.key))} value</span><textarea name="value" rows="2" required>${escapeHtml(setting.value)}</textarea></label><button class="btn btn-secondary" type="submit" ${isAdmin() ? "" : "disabled"}>Save</button></form>`).join("") : "<div class=\"admin-empty-state\"><h3>No site settings found</h3><p>Seed the database to create the starter settings.</p></div>"}</section>`;\n        mainEl.querySelectorAll("[data-setting-form]").forEach((form) => form.addEventListener("submit", async (event) => {\n            event.preventDefault();\n            const data = new FormData(form);\n            const button = form.querySelector("[type=\"submit\"]");\n            button.disabled = true;\n            try {\n                await settingsApi.update(form.dataset.settingForm, { value: data.get("value").toString() });\n                showToast("Setting saved.");\n            } catch (error) { showToast(error.message, "error"); }\n            finally { button.disabled = !isAdmin(); }\n        }));\n    } catch (err) {\n        showPageError(err);\n    }\n};\n\n';
const newContent = content.slice(0, index + 2) + newFunction + content.slice(index + 2);
fs.writeFileSync(path, newContent);
console.log('Done');