/*
Copyright (c) 2024 Subfork

Example module for creating tasks.
*/

// instantiate subfork client
const subfork = new Subfork();

// default some constants
const min_t = 1;  // min value for task function kwarg "t"
const max_t = 20; // max value for task function kwarg "t"
const placeholder = "enter a number between " + min_t + " and " + max_t;
const task_counter = 0;
const task_queue = "test";  // name of the subfork task queue
const timeout = 3000;

// document on ready, create data table
$(document).ready(function() {
    webix.ui({
        id: "dtable",
        view: "datatable", 
        container: "table",
        position: "flex",
        minHeight: 300,
        scrollX: false,
        scrollY: true,
        columns: [
            {id:"id", header:"Task ID", width:300},
            {id:"status", header:"Status", width:150},
            {id:"results", header:"Results", fillspace:true}
        ],
    });
});

// creates the new task modal and form
function create_form() {
    if ($$("myModal"))
        $$("myModal").destructor();
    if ($$("myForm"))
        $$("myForm").destructor();
    let myform = {
      rows:[
        {
          id: "myForm",
          view: "form",
          elements: [
              {view:"text", name:"t", id:"t", placeholder:placeholder},
              {cols:[
                {view:"button", value:"Cancel", css:"Webix_secondary", click:function(){$$("myModal").close()}},
                {view:"button", value:"Create", css:"Webix_primary", click:function(){
                  if ($$("myForm").validate()) {
                    create_task();
                  }
                }},
              ]}
          ],
          rules: {
            "t": webix.rules.isNumber,
          }
        }
      ]
    };
    let modal = webix.ui({
      view: "window",
      id: "myModal",
      close: true,
      modal: true,
      move: false,
      padding: 0,
      resize: false,
      width: 350,
      head: "Create Task",
      headHeight: 35,
      position: "center",
      body: myform
    });
    modal.show();
};
  
// create subfork worker task
function create_task() {
    if (task_counter === 0) {
        let form = $$("myForm");
        let data = form.getValues();
        let t = Number(data["t"]);
        if (t) {
            if (t < min_t || t > max_t) {
                webix.message(placeholder, "error");
                $$("myForm").markInvalid("t");
            } else {
                $$("myModal").close();
                subfork.task(task_queue).create({t:t});
                ++task_counter;
                setTimeout(function() {
                    --task_counter;
                }, timeout);
            };
        }
    } else {
        webix.message("please wait...", "error");
    };
};

// subfork on ready callback
function init() {
    console.log("init");

    // task created callback
    subfork.task(task_queue).on("created", function(evt) {
        console.log("created", evt);
        webix.message(evt.message, "success");
        $$("dtable").add({
            "id": evt.task().data.id,
            "status": "waiting...",
            "results": ""
        });
    });

    // task completed callback
    subfork.task(task_queue).on("done", function(evt) {
        console.log("done", evt);
        webix.message(evt.message, "success");
        let row = $$("dtable").getItem(evt.task().data.id);
        let results = "";
        if (evt.task().data.success) {
            results = evt.task().get_results();
        } else {
            results = evt.task().get_error();
        };
        if (row) {
            $$("dtable").updateItem(row.id, {
                "status": "done",
                "results": results
            });
        } else {
            $$("dtable").add({
                "id": evt.task().data.id,
                "status": "done",
                "results": results
            });
        };
    });
};

// run init function
subfork.ready(function() {
    console.log("ready");
    init();
});
