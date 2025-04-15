/*
Copyright (c) 2024 Subfork
*/

// switches webix theme
function switch_theme() {
  const theme = ColorModes.getTheme();
  const links = document.getElementsByTagName("link");
  for(let i = 0; i < links.length; i++){
    const link = links[i];
    if(/willow/.test(link.href) && theme == "dark"){
      link.href = link.href.replace("willow", "dark"); 
      webix.skin.set("dark");
      break;
    } else if(/dark/.test(link.href) && theme == "light"){ 
      link.href = link.href.replace("dark", "willow");
      webix.skin.set("willow"); 
      break;
    }
  }
};

switch_theme();
