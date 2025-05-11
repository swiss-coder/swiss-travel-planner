async function loadDestinations() {
  const response = await fetch('data/destinations.csv');
  const text = await response.text();
  const rows = text.split('\n').slice(1); // skip header

  const destinations = rows
    .filter(row => row.trim() !== '')
    .map(row => {
      const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g); // Smart CSV regex

      if (!matches || matches.length < 8) {
        console.warn('Skipping invalid row:', row);
        return null;
      }

      const [name, slug, type, region, activities, averageCostPerDay, daysRequired, description] = matches;

      return {
        name: name.replace(/^"|"$/g, '').trim(),
        slug: slug.replace(/^"|"$/g, '').trim(),
        type: type.replace(/^"|"$/g, '').split('|').map(t => t.trim()),
        region: region.replace(/^"|"$/g, '').trim(),
        activities: activities.replace(/^"|"$/g, '').split('|').map(a => a.trim()),
        averageCostPerDay: Number(averageCostPerDay.trim()),
        daysRequired: Number(daysRequired.trim()),
        description: description.replace(/^"|"$/g, '').trim()
      };
    }).filter(d => d !== null); // remove nulls
    return destinations;
}