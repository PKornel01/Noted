const profileBtn = document.getElementById('profileBtn');
const dropdown = document.getElementById('profileDropdown');

profileBtn.addEventListener('click', () => {
    dropdown.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

const defaultAvatar = "default-avatar.png"; // defautlt profile picture
const userAvatarUrl = null;

function setAvatar(url) {
    const finalUrl = url || defaultAvatar;
    document.getElementById('avatarImg').src = finalUrl;
    document.getElementById('dropdownAvatarImg').src = finalUrl;
}

setAvatar(userAvatarUrl);