/*
Copyright (c) 2024 Subfork

Example module for user settings.
*/

// instantiate subfork client
const subfork = new Subfork();

// creates the user settings form
function create_form() {
    if ($$("myForm")) 
      return;
    const theme = ColorModes.getTheme();
    let value = 0;
    if (theme == "dark") {
        value = 1;
    } else {
        value = 0;
    };
    webix.ui({
        container: "settingsform",
        rows:[
          {
            id: "myForm",
            view: "form",
            elements: [
                {view:"text", name:"name", id:"name", label:"Name", placeholder:"name"},
                {view:"text", name:"username", id:"username", label:"Username", placeholder:"username"},
                {view:"text", name:"email", id:"email", label:"Email", placeholder:"email"},
                {view:"text", name:"password", id:"password", label:"Password", type:"password", placeholder:"password"},
                { 
                    view: "switch",
                    label: "Theme",
                    value: value,
                    onLabel: "dark",
                    offLabel: "light",
                    on: {
                        onChange: function(newValue, oldValue, config){
                            if (newValue) {
                                ColorModes.setTheme("dark");
                            } else {
                                ColorModes.setTheme("light");
                            }
                            switch_theme();
                        }
                    }
                },
                {cols:[
                //   {view:"button", value:"Cancel", css:"Webix_secondary", click:function(){$$("myModal").close()}},
                  {view:"button", value:"Save", css:"Webix_primary", click:function(){
                    if ($$("myForm").validate()) {
                      submit();
                    }
                  }},
                ]}
            ],
            rules: {
              "name": webix.rules.isNotEmpty,
              "username": webix.rules.isNotEmpty,
              "email": webix.rules.isEmail,
              "password": webix.rules.isNotEmpty,
            }
          }
        ]
    });
};

// loads a user profile into the page
function load_profile(username) {
  let user = subfork.user(username);
  if (user) {
    $("#name").text(user.data.name);
    $("#username").text(user.data.username);
    $("#email").text(user.data.email);
    $("#profile_img").attr("src", user.data.profile_image);
    $("#loading").hide();
    $("#usercard").show();
  } else {
    $("#loading").hide();
    $("#notfound").show();
  }
};
