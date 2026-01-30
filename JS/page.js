function f12() {
  console.log("  ____    _                           _         _             ");
  console.log(
    " |  _ \\  (_)  _   _   _   _   _   _  (_)  ____ | |__    _   _ "
  );
  console.log(
    " | | | | | | | | | | | | | | | | | | | | |_  / | '_ \\  | | | |"
  );
  console.log(" | |_| | | | | |_| | | |_| | | |_| | | |  / /  | | | | | |_| |");
  console.log(
    " |____/  |_|  \\__, |  \\__,_|  \\__, | |_| /___| |_| |_|  \\__,_|"
  );
  console.log("              |___/           |___/                           ");
}

function changeBackground(videoSrc) {
  const backgroundVideo = document.getElementById("background");

  if (backgroundVideo) {
    backgroundVideo.src = videoSrc;
    backgroundVideo.load();
    backgroundVideo.play();

    console.log(`背景视频已切换为: ${videoSrc}`);
  }
}

function togglePlayer() {
  // 获取固定播放器元素
  const fp = document.getElementById("fixedPlayer");
  if (!fp) return;

  // 切换播放器的open类，控制展开/折叠状态
  fp.classList.toggle("open");

  // 获取播放器切换按钮元素
  const btn = document.getElementById("playerToggle");

  // 根据播放器当前状态更新按钮显示文本和无障碍标签
  if (fp.classList.contains("open")) {
    btn.innerText = "◀";
    btn.setAttribute("aria-label", "折叠播放器");
  } else {
    btn.innerText = "▶";
    btn.setAttribute("aria-label", "展开播放器");
  }
}

// 页面加载时绑定按钮事件
window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("playerToggle");
  if (btn) btn.addEventListener("click", togglePlayer);
});
