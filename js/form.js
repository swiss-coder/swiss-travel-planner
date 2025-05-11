// Save form data into localStorage
const form = document.getElementById('trip-form');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    localStorage.setItem('start-date', formData.get('start-date'));
    localStorage.setItem('end-date', formData.get('end-date'));
    localStorage.setItem('entry', formData.get('entry'));
    localStorage.setItem('exit', formData.get('exit'));
    localStorage.setItem('group', formData.get('group'));
    // (We revised and removed this one later)localStorage.setItem('budget', formData.get('budget'));

    const styles = formData.getAll('style');
    const activities = formData.getAll('activities');

    localStorage.setItem('style', JSON.stringify(styles));
    localStorage.setItem('activities', JSON.stringify(activities));

    window.location.href = 'results.html';
});

// Define the correct mapping
const styleCheckboxes = document.querySelectorAll('input[name="style"]');
const activityCheckboxes = document.querySelectorAll('input[name="activities"]');

// Activities per style (common activities are added to both)
const styleActivityMap = {
    "city": ["museums", "shopping", "walking", "sightseeing", "culture", "festivals", "photography"],
    "nature": ["hiking", "skiing", "spa", "adventure sports", "wellness", "festivals", "photography"]
};

function updateActivities() {
    const selectedStyles = Array.from(styleCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    if (selectedStyles.length === 0 || selectedStyles.length === 2) {
        // No style selected or both selected: all activities active
        activityCheckboxes.forEach(cb => {
            cb.disabled = false;
        });
    } else {
        const allowedActivities = new Set();
        selectedStyles.forEach(style => {
            (styleActivityMap[style] || []).forEach(activity => allowedActivities.add(activity));
        });

        activityCheckboxes.forEach(cb => {
            if (allowedActivities.has(cb.value)) {
                cb.disabled = false;
            } else {
                cb.disabled = true;
                cb.checked = false;
            }
        });
    }
}

// Add event listeners
styleCheckboxes.forEach(cb => cb.addEventListener("change", updateActivities));

// Initial call
updateActivities();