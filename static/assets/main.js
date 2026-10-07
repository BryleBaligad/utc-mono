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

        itemDiv.onmousedown = () => {
            selectPage(listItem.page, itemDiv);
        }

        itemDiv.ontouchstart = () => {
            selectPage(listItem.page, itemDiv);
        }

        if (listItem.title) {
            itemDiv.setAttribute("data-page-label", listItem.title);

            if (listItem.selected) {
                document.getElementById("page-label").innerText = listItem.title
            }
        }

        sidebar.appendChild(itemDiv)
    }
}

function generateSidebarByRole(role) {
    switch (role) {
        case "": {
            generateSidebar([
                {
                    icon: "Door in",
                    label: "Log in",
                    page: "login.html",
                    title: "Dashboard Login",
                    selected: true
                }
            ])
            break;
        }

        case "admin": {
            generateSidebar([
                {
                    icon: "House",
                    label: "Home",
                    page: "home.html",
                    title: "Dashboard Home",
                    selected: true
                },
                {
                    icon: "Group",
                    label: "Accounts",
                    page: "accounts.html",
                    title: "Account Management"
                },
                {
                    icon: "Car",
                    label: "Fleet",
                    page: "fleet.html",
                    title: "Fleet Management"
                },
                {
                    icon: "Map",
                    label: "Trips",
                    page: "trips.html",
                    title: "Trip Management"
                },
                {
                    icon: "Door Out",
                    label: "Log out",
                    page: "logout.html",
                    title: "Log Out"
                },
            ])
            break;
        }

        case "manager": {
            generateSidebar([
                {
                    icon: "House",
                    label: "Home",
                    page: "home.html",
                    title: "Dashboard Home",
                    selected: true
                },
                {
                    icon: "Car",
                    label: "Fleet",
                    page: "fleet.html",
                    title: "Fleet Management"
                },
                {
                    icon: "Map",
                    label: "Trips",
                    page: "trips.html",
                    title: "Trip Management"
                },
                {
                    icon: "Door Out",
                    label: "Log out",
                    page: "logout.html",
                    title: "Log Out"
                },
            ])
            break;
        }

        case "driver": {
            generateSidebar([
                {
                    icon: "Map",
                    label: "Trip Assignments",
                    page: "trip_assignments.html",
                    title: "Trip Assignments",
                    selected: true
                },
                {
                    icon: "Door Out",
                    label: "Log out",
                    page: "logout.html",
                    title: "Log Out"
                },
            ])
            break;
        }
    }
}

fetch("/api/v1/sessions").then(async res => {
    if (res.status == 200) {
        let role = (await res.json()).role;
        if (role != "customer") {
            generateSidebarByRole(role)
        } else {
            fetch("/api/v1/sessions", {
                method: "DELETE"
            });
        }
    } else if (res.status == 401) {
        generateSidebarByRole("");
    }
})

setInterval(() => {
    fetch("/api/v1/sessions").then(res => {
        if (res.status != 200) {
            console.log("Session timeout")
            generateSidebarByRole("");
        }
    })
}, (15 * 60000) + 100);

async function selectPage(page, element) {
    if (page == selectedSidebarPage) return;
    selectedSidebarPage = page;

    selectedSidebarItem?.classList.remove("selected")

    selectedSidebarItem = element;

    element.classList.add("selected")

    if (selectedSidebarItem.getAttribute("data-page-label")) {
        document.getElementById("page-label").innerText = selectedSidebarItem.getAttribute("data-page-label")
    } else {
        document.getElementById("page-label").innerText = "Dashboard"
    }

    let newContent = await (await fetch(`/pages/${page}`)).text();
    let fragment = document.createRange().createContextualFragment(newContent)

    let content = document.getElementById("content");
    content.innerHTML = "";
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

function convertToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};