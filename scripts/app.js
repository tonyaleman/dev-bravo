//Shows the toasts
const toastElement = document.getElementById("login-toast");

if (toastElement) {
  const toast = new bootstrap.Toast(toastElement);
  toast.show();
}


//Search Box
const searchBox = document.getElementById("search-box");
const searchButton = document.getElementById("search-btn");

//When person clicks button
if (searchButton) {
  searchButton.addEventListener("click", function () {
    const searchText = searchBox.value;

    console.log("Searching for:", searchText);
  });
}


//Game Filter
const filter = document.getElementById("filter");

//When person clicks on filter
if (filter) {
  filter.addEventListener("click", function () {
    console.log("Game filter opened");
  });
}