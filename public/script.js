// Particle generation
const particlesContainer = document.getElementById("particles");
for (let i = 0; i < 40; i++) {
  const particle = document.createElement("div");
  particle.className = "particle";
  particle.style.left = Math.random() * 100 + "%";
  particle.style.animationDelay = Math.random() * 20 + "s";
  particle.style.animationDuration = Math.random() * 15 + 15 + "s";
  particlesContainer.appendChild(particle);
}

const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const uploadForm = document.getElementById("uploadForm");
const resultDiv = document.getElementById("result");
const loadingDiv = document.getElementById("loading");
const downloadButton = document.getElementById("downloadButton");
const dropArea = document.getElementById("dropArea");
let analysisResult = "";
let analysisImage = "";
let uploadedFile = null;

dropArea.addEventListener("click", () => imageInput.click());

dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.style.borderColor = "transparent";
  dropArea.style.background = "rgba(16, 185, 129, 0.15)";
});

dropArea.addEventListener("dragleave", () => {
  dropArea.style.borderColor = "rgba(16, 185, 129, 0.4)";
  dropArea.style.background = "rgba(16, 185, 129, 0.04)";
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.style.borderColor = "rgba(16, 185, 129, 0.4)";
  dropArea.style.background = "rgba(16, 185, 129, 0.04)";
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    uploadedFile = file;
    imageInput.files = e.dataTransfer.files;
    handleImageUpload(file);
  }
});

imageInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    uploadedFile = file;
    handleImageUpload(file);
  }
});

function handleImageUpload(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    imagePreview.src = e.target.result;
    imagePreview.style.display = "block";
  };
  reader.readAsDataURL(file);
}

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  loadingDiv.style.display = "block";
  resultDiv.style.display = "none";
  resultDiv.textContent = "";
  downloadButton.style.display = "none";

  try {
    const response = await fetch("/analyze", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (data.result) {
      analysisResult = data.result;

      if (uploadedFile) {
        analysisImage = await convertImageToPNG(uploadedFile);
      } else {
        analysisImage = data.image;
      }

      resultDiv.innerHTML =
        "<h3><i class='fas fa-circle-check'></i> Analysis Complete</h3><p>" +
        analysisResult.replace(/\n/g, "<br>") +
        "</p>";
      resultDiv.style.display = "block";
      downloadButton.style.display = "block";
    } else if (data.error) {
      resultDiv.innerHTML =
        "<h3><i class='fas fa-circle-exclamation'></i> Error</h3><p>" +
        data.error +
        "</p>";
      resultDiv.style.display = "block";
    }
  } catch (error) {
    resultDiv.innerHTML =
      "<h3><i class='fas fa-circle-exclamation'></i> Error</h3><p>" +
      error.message +
      "</p>";
    resultDiv.style.display = "block";
  } finally {
    loadingDiv.style.display = "none";
  }
});

async function convertImageToPNG(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = function (e) {
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

downloadButton.addEventListener("click", async () => {
  const response = await fetch("/download", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      result: analysisResult,
      image: analysisImage,
    }),
  });

  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "PlantScan_Analysis_Report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } else {
    alert("Failed to generate PDF report. Please try again.");
  }
});

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});
