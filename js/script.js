//GLOBALS VARAIBLES

const images = document.querySelectorAll(".gallery-item img");
let imgSrc;

//globalImageViewer

// get images src onclick

images.forEach((img) => {
    img.addEventListener("click", (e) => {
        imgSrc = e.target.src;
        console.log(imgSrc)
        imgModal(imgSrc)
    });
});


let imgModal = (src) => {
    const modal = document.createElement("div");
    modal.setAttribute("class", "modal");
    document.querySelector(".visualWrapper").append(modal);
    //IMG
    const newImage = document.createElement("img");
    newImage.setAttribute("src", src);
    modal.append(newImage)
    //CLOSE
    modal.addEventListener("click", (e) =>{
        if (e.target.classList.contains("modal")) {
            modal.classList.remove("modal");
            modal.remove(newImage);
        }
    });
}

images.forEach((img) => {
    img.addEventListener("click", (e) => {
        imgSrc = e.target.src;
        console.log(imgSrc)
        imgModalPage(imgSrc)
    });
});

let imgModalPage = (src) => {
    const modal = document.createElement("div");
    modal.setAttribute("class", "modal");
    //add the modal to the main section or the parent element
    document.querySelector(".fadeWrapper").append(modal);
    //adding image to modal
    const newImage = document.createElement("img");
    newImage.setAttribute("src", src);
    modal.append(newImage)
    //creating the close button
    modal.addEventListener("click", (e) =>{
        if (e.target.classList.contains("modal")) {
            modal.classList.remove("modal");
            modal.remove(newImage);
        }
    });
}

//globalImageViewerEND

// GLOBAL IMAGE BEGINNING

const item = document.querySelectorAll(".images img");

item.forEach((img) => {
    img.addEventListener("click", (e) => {
        imgSrc = e.target.src;
        console.log(imgSrc)
        imgModal(imgSrc)
    });
});

item.forEach((img) => {
    img.addEventListener("click", (e) => {
        imgSrc = e.target.src;
        console.log(imgSrc)
        imgModalPage(imgSrc)
    });
});

// GLOBAL IMAGE END

//NAV_MODAL
let navMenu = document.querySelector(".menubar");
let Nmodal = document.querySelector(".navModal");
let lastFocusedNavElement = null;

if (navMenu && Nmodal) {
    navMenu.onclick = () => {
        const isActive = Nmodal.classList.toggle("active");
        navMenu.classList.toggle("change");
        navMenu.setAttribute('aria-expanded', isActive);
        
        if (isActive) {
            lastFocusedNavElement = document.activeElement;
            Nmodal.setAttribute('aria-hidden', 'false');
            // Focus first link in nav
            const firstLink = Nmodal.querySelector('a');
            if (firstLink) setTimeout(() => firstLink.focus(), 100);
        } else {
            Nmodal.setAttribute('aria-hidden', 'true');
            if (lastFocusedNavElement) lastFocusedNavElement.focus();
        }
    };

    // Global listeners for Nav Modal (ESC and Tab Trap)
    document.addEventListener('keydown', (e) => {
        if (!Nmodal.classList.contains('active')) return;

        if (e.key === 'Escape') {
            navMenu.click();
        }

        if (e.key === 'Tab') {
            const focusableElements = Nmodal.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
            if (focusableElements.length > 0) {
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        }
    });
}

//

//VISUAL_MODAL

images.forEach((img) => {
    img.addEventListener("click", (e) => {
        imgSrc = e.target.src;
        console.log(imgSrc)
        imgGalleryPage(imgSrc)
    });
});

let imgGalleryPage = (src) => {
    const modal = document.createElement("images");
    modal.setAttribute("class", "modal");
    //add the modal to the main section or the parent element
    document.querySelector(".galleryWrapper").append(modal);
    //adding image to modal
    const newImage = document.createElement("img");
    newImage.setAttribute("src", src);
    modal.append(newImage)
    //creating the close button
    modal.addEventListener("click", (e) =>{
        if (e.target.classList.contains("modal")) {
            modal.classList.remove("modal");
            modal.remove(newImage);
        }
    });
}