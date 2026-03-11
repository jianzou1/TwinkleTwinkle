// 配置所有备选的 ASCII 字符的 txt 文件路径（根据实际文件修改）
const ASCII_TXT_PATHS = [
    '/ui/ascii1.txt',
    '/ui/ascii2.txt'
];

// 生成随机 txt 文件路径
const getRandomAsciiTxt = () => {
  const randomIndex = Math.floor(Math.random() * ASCII_TXT_PATHS.length);
  return ASCII_TXT_PATHS[randomIndex];
};

// 读取 txt 文件内容并显示到对应 div 中
const displayAsciiContent = async () => {
  const asciiTxtPath = getRandomAsciiTxt();
  const response = await fetch(asciiTxtPath);
  const asciiContent = await response.text();

  const logo = document.querySelector('.logo');
  if (logo) {
      let textContainer = logo.querySelector('.text-container');
      if (!textContainer) {
          textContainer = document.createElement('div');
          textContainer.classList.add('text-container');
          logo.appendChild(textContainer);
      }
      textContainer.textContent = asciiContent;

      // 动态缩放逻辑
      const containerWidth = logo.offsetWidth;

      const textElement = document.createElement('span');
      textElement.textContent = asciiContent;
      textElement.style.fontFamily = 'Courier New, Courier, monospace';
      textElement.style.fontSize = '14px';
      textElement.style.whiteSpace = 'pre';
      document.body.appendChild(textElement);

      const textWidth = textElement.offsetWidth;
      document.body.removeChild(textElement);

      const scale = containerWidth / textWidth;

      textContainer.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }
};

// 主逻辑：显示随机 ASCII 字符
export const initializeRandomLogo = () => {
  displayAsciiContent();
};