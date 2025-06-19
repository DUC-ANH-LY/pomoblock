document.addEventListener("DOMContentLoaded", () => {
  const newSiteInput = document.getElementById("newSite");
  const addSiteButton = document.getElementById("addSite");
  const blockedSitesList = document.getElementById("blockedSitesList");

  function loadBlockedSites() {
    chrome.storage.local.get(["blockedSites"], (result) => {
      const blockedSites = result.blockedSites || [];
      blockedSitesList.innerHTML = "";

      blockedSites.forEach((site) => {
        const siteElement = createSiteElement(site);
        blockedSitesList.appendChild(siteElement);
      });
    });
  }

  function createSiteElement(site) {
    const div = document.createElement("div");
    div.className = "blocked-site";
    div.innerHTML = `
      <span>${site}</span>
      <button type="button" class="remove-site" data-site="${site}">Remove</button>
    `;
    return div;
  }

  function extractDomain(url) {
    try {
      // Remove protocol if present
      let domain = url.replace(/^https?:\/\//, '');
      // Remove www. if present
      domain = domain.replace(/^www\./, '');
      // Remove path and query parameters
      domain = domain.split('/')[0];
      // Remove port if present
      domain = domain.split(':')[0];
      return domain.toLowerCase();
    } catch (error) {
      return url.toLowerCase();
    }
  }

  addSiteButton.addEventListener("click", () => {
    const input = newSiteInput.value.trim();
    if (input) {
      // Extract domain from the input
      const site = extractDomain(input);
      
      chrome.storage.local.get(["blockedSites"], (result) => {
        const blockedSites = result.blockedSites || [];
        if (!blockedSites.includes(site)) {
          blockedSites.push(site);
          chrome.storage.local.set({ blockedSites }, () => {
            loadBlockedSites();
            newSiteInput.value = "";
            // Show user what domain was extracted
            if (input !== site) {
              console.log(`Domain extracted: ${input} → ${site}`);
            }
          });
        } else {
          alert(`${site} is already in the blocked sites list.`);
        }
      });
    }
  });

  // Also handle Enter key press
  newSiteInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addSiteButton.click();
    }
  });

  blockedSitesList.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-site")) {
      const siteToRemove = e.target.dataset.site;
      chrome.storage.local.get(["blockedSites"], (result) => {
        const blockedSites = result.blockedSites || [];
        const updatedSites = blockedSites.filter(
          (site) => site !== siteToRemove
        );
        chrome.storage.local.set(
          { blockedSites: updatedSites },
          loadBlockedSites
        );
      });
    }
  });

  loadBlockedSites();
});
