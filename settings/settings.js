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

  addSiteButton.addEventListener("click", () => {
    const site = newSiteInput.value.trim().toLowerCase();
    if (site) {
      chrome.storage.local.get(["blockedSites"], (result) => {
        const blockedSites = result.blockedSites || [];
        if (!blockedSites.includes(site)) {
          blockedSites.push(site);
          chrome.storage.local.set({ blockedSites }, () => {
            loadBlockedSites();
            newSiteInput.value = "";
          });
        }
      });
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
