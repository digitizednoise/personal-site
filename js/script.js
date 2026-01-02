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
let indexNavMenu = document.querySelector(".indexMenuBar");

navMenu.onclick = () => {
    navMenu.classList.toggle("change")
    Nmodal.classList.toggle("active")

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