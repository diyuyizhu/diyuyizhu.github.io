function switchTab(tabName) {
  // 隐藏所有表单部分
  const formSections = document.querySelectorAll(".form-section");
  formSections.forEach((section) => {
    section.classList.remove("active");
  });

  // 移除所有标签的活动状态
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach((btn) => {
    btn.classList.remove("active");
  });

  // 显示选中的表单部分
  const targetForm = document.getElementById(tabName + "-form");
  if (targetForm) {
    targetForm.classList.add("active");
  }

  // 激活对应的标签按钮（通过 onclick 属性判断）
  tabBtns.forEach((btn) => {
    try {
      const onclick = btn.getAttribute("onclick") || "";
      if (
        onclick.indexOf("'" + tabName + "'") !== -1 ||
        onclick.indexOf('"' + tabName + '"') !== -1
      ) {
        btn.classList.add("active");
      }
    } catch (e) {
      // ignore
    }
  });
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

function showError(inputEl, msg) {
  clearError(inputEl);
  const span = document.createElement("span");
  span.className = "input-error";
  span.style.color = "#c0392b";
  span.style.fontSize = "12px";
  span.style.display = "block";
  span.style.marginTop = "6px";
  span.textContent = msg;
  inputEl.parentNode.appendChild(span);
}

function clearError(inputEl) {
  const parent = inputEl.parentNode;
  const old = parent.querySelector(".input-error");
  if (old) old.remove();
}

function clearAllErrors(formEl) {
  formEl.querySelectorAll(".input-error").forEach((e) => e.remove());
}

function validateRegisterForm() {
  const username = document.getElementById("register-username");
  const email = document.getElementById("register-email");
  const password = document.getElementById("register-password");
  const klass = document.getElementById("register-class");

  clearAllErrors(username.form || document);

  // 用户名支持中文/英文字母/数字/-_，长度3-20
  const usernameRe = /^[\u4e00-\u9fa5A-Za-z0-9_-]{3,20}$/u;
  if (!usernameRe.test(username.value.trim())) {
    showError(
      username,
      "用户名需为3-20位，支持中文、字母、数字、下划线或短横线"
    );
    username.focus();
    return false;
  }

  // 邮箱校验
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email.value.trim())) {
    showError(email, "请输入有效的邮箱地址");
    email.focus();
    return false;
  }

  // 密码至少8位，包含大小写字母、数字或特殊字符中的至少两类
  const pwdRe = /^(?=.{8,})(?=.*[A-Za-z])(?=.*\d).+$/;
  if (!pwdRe.test(password.value)) {
    showError(password, "密码至少8位，且包含字母和数字");
    password.focus();
    return false;
  }

  // 班级必选
  if (!klass.value) {
    showError(klass, "请选择班级");
    klass.focus();
    return false;
  }

  return true;
}

function initPage() {
  // 表单提交
  const registerFormContainer = document.getElementById("register-form");
  if (registerFormContainer) {
    const form = registerFormContainer.querySelector("form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        clearAllErrors(form);
        if (validateRegisterForm()) {
          alert("信息已提交");
          form.reset();
        }
      });
    }
  }

  // 非空验证
  const loginFormContainer = document.getElementById("login-form");
  if (loginFormContainer) {
    const form = loginFormContainer.querySelector("form");
    if (form) {
      form.addEventListener("submit", function (e) {
        const user = document.getElementById("login-username");
        const pwd = document.getElementById("login-password");
        if (!user.value.trim()) {
          e.preventDefault();
          alert("请输入用户名");
          user.focus();
        } else if (!pwd.value) {
          e.preventDefault();
          alert("请输入密码");
          pwd.focus();
        }
      });
    }
  }
}
