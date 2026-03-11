// password.js
let passwordInputListener = null; // 保存输入框的监听函数

export function initializePassword(pjax = null) {
    const submitButton = document.getElementById('password-submit');
    const passwordInput = document.getElementById('password-input');
    if (!submitButton || !passwordInput) return;

    const handleSubmit = async () => {
        const password = passwordInput.value.trim();
        if (!password) {
            showPasswordError('请输入密码', passwordInput);
            return;
        }
        try {
            const hashPrefix = await getHashPrefix(password);
            const postPath = `/post/${hashPrefix}/`;
            const url = `${window.location.origin}${postPath}`;
            const resp = await fetch(url, { method: 'HEAD' });
            if (resp.ok) {
                if (pjax && typeof pjax.loadUrl === 'function') {
                    try {
                        await pjax.loadUrl(postPath);
                    } catch (pjaxError) {
                        console.warn('PJAX跳转失败，回退整页跳转:', pjaxError);
                        window.location.href = url;
                    }
                } else {
                    window.location.href = url;
                }
            } else {
                showPasswordError('密码错误，请重试。', passwordInput);
            }
        } catch (error) {
            console.error('密码验证失败:', error);
            showPasswordError('密码错误，请重试。', passwordInput);
        }
    };

    passwordInputListener = (e) => {
        if (e.key === 'Enter') handleSubmit();
    };

    submitButton.addEventListener('click', handleSubmit);
    passwordInput.addEventListener('keydown', passwordInputListener);
    passwordInput.focus();
}

async function getHashPrefix(password) {
    const encoded = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return hashHex.substring(0, 8);
}

// 显示与 dailyPopup 风格一致的错误弹窗
function showPasswordError(message, passwordInput) {
    if (passwordInput && passwordInputListener) {
        passwordInput.removeEventListener('keydown', passwordInputListener);
    }

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'password-error-overlay';

    const popup = document.createElement('div');
    popup.id = 'password-error-popup';
    popup.className = 'window';
    popup.innerHTML = `
        <header class="title-bar">
            <div class="title-bar-text" data-lang-id="提示">Error</div>
            <div class="title-bar-controls">
                <button aria-label="Close" id="password-error-close-icon"></button>
            </div>
        </header>
        <section class="window-body">
            <p>${message}</p>
        </section>
        <button id="password-error-close" data-lang-id="btn_ok">OK</button>
    `;

    document.body.append(overlay, popup);

    const closeFn = () => {
        overlay.remove();
        popup.remove();
        document.removeEventListener('keydown', handleKeyDown);
        if (passwordInput && passwordInputListener) {
            passwordInput.addEventListener('keydown', passwordInputListener);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') closeFn();
    };

    document.addEventListener('keydown', handleKeyDown);
    popup.querySelector('#password-error-close').addEventListener('click', closeFn);
    popup.querySelector('#password-error-close-icon')?.addEventListener('click', closeFn);
}
