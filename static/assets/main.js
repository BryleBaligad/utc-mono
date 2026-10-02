let selectedSidebarPage = "";
let selectedSidebarItem;

function generateSidebar(list) {
    let sidebar = document.getElementById("sidebar-items");
    sidebar.innerHTML = "";
    for (let i = 0; i < list.length; i++) {
        const listItem = list[i];
        let itemDiv = document.createElement("div");
        itemDiv.className = "sidebar-item";
        if (listItem.selected) {
            itemDiv.classList.add("selected");
            selectPage(listItem.page, itemDiv);
        }

        let iconImg = document.createElement("img");
        iconImg.className = "sidebar-icon"
        iconImg.src = `/assets/icons/silk-svg/${listItem.icon}.svg`;

        let labelSpan = document.createElement("span");
        labelSpan.className = "sidebar-label"
        labelSpan.innerText = listItem.label;

        itemDiv.appendChild(iconImg)
        itemDiv.appendChild(labelSpan)

        itemDiv.onclick = () => {
            selectPage(listItem.page, itemDiv);
        }

        sidebar.appendChild(itemDiv)

        if (listItem.title) {
            document.getElementById("page-label").innerText = listItem.title;
        }
    }
}

generateSidebar([
    {
        icon: "Door in",
        label: "Log in",
        page: "login.html",
        title: "Dashboard Login",
        selected: true
    }
])

async function selectPage(page, element) {
    if (page == selectedSidebarPage) return;
    selectedSidebarPage = page;

    selectedSidebarItem?.classList.remove("selected")

    selectedSidebarItem = element;

    element.classList.add("selected")

    let content = document.getElementById("content");
    content.innerHTML = "";

    let newContent = await (await fetch("/pages/login.html")).text();
    let fragment = document.createRange().createContextualFragment(newContent)
    content.appendChild(fragment)
} 

function toggleSidebar() {
    document.getElementById("main-container").classList.toggle("collapse")
    let collapseIcon = document.getElementById("sidebar-collapse-icon");
    if (collapseIcon.src.includes("collapse")) {
        collapseIcon.src = "/assets/icons/silk-svg/Application side expand.svg"
    } else {
        collapseIcon.src = "/assets/icons/silk-svg/Application side collapse.svg"
    }
}

if (window.matchMedia("(pointer: coarse)").matches) {
    document.documentElement.style.setProperty('--sidebar-collapse-animation-duration', '0ms');
    toggleSidebar();
    setTimeout(() => {
        document.documentElement.style.setProperty('--sidebar-collapse-animation-duration', '200ms');
    }, 1);
}