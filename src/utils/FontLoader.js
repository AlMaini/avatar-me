export const loadCustomFont = async () => {
  const fontFace = new FontFace('CustomTerminal', 'url(./fonts/Glass_TTY_VT220.ttf)');
  await fontFace.load();
  document.fonts.add(fontFace);
  return fontFace;
};