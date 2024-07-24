/*
Copyright (c) 2024 Subfork

Example module for creating, updating and deleting data.
*/

// instantiate subfork client
const subfork = new Subfork();

// define some constants for this demo
const properties = ["Beach House", "Ski Cabin", "Penthouse"];
const guests = ["Joe", "Bob", "Sally", "Fred", "Cindy"];

// override webix calendar popup editor settings
webix.editors.$popup = {
  date:{
    view:"popup",
    body:{view:"calendar", timepicker:false, icons:true}
  }
};

// formats an ISO date string
function format_date(v) {
  return webix.i18n.parseFormatDate(v.split("T")[0]);
};

// returns today's date as YYYY-MM-DD
function get_date() {
  let d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
};

// submits a new booking
function submit() {
  let form = $$("myForm");
  let data = form.getValues();
  subfork.data("bookings").create(data, function(resp) {
    if (resp.success) {
      $$("dtable").add(resp.data);
      update_calendar();
    } else {
      console.error(resp.message);
      webix.message(resp.message, "error");
    };
    $$("myModal").close();
  });
};

// updates the bookings table
function update_table(data) {
  dt = $$("dtable");
  dt.clearAll();
  dt.parse(data);
  update_calendar();
};

// adds bookings to the calendar
function update_calendar() {
  let dates = [];
  let d = 0;
  let numrows = $$("dtable").count();
  for (let i=0; i<numrows; i++) {
    let rowid = $$("dtable").data.order[i];
    let item = $$("dtable").getItem(rowid);
    let checkin = format_date(item.checkin);
    for (let n=0; n<item.nights; n++) {
      dates[d] = webix.Date.add(checkin, n, "day", true);
      d++;
    }
  }

  $$("myCal").define("blockDates", function(date){
    let block = false;
    for (let i=0; i<dates.length; i++){
      if (webix.Date.equal(date, dates[i])){
        block = true;  
      }
    };
    return block;
  });
  $$("myCal").refresh();
};

// creates the new data modal and form
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
            {view:"datepicker", name:"checkin", id:"checkin", label:"Check in", type:"date", value:get_date(), stringResult:true},
            {view:"text", name:"nights", id:"nights", label:"Nights", placeholder:"number of nights"},
            {view:"combo", name:"propid", label:"Property", options:properties, placeholder:"choose a property"},
            {view:"combo", name:"guestid", label:"Guest", options:guests, placeholder:"choose a guest"},
            {view:"text", name:"total", id:"total", label:"Total ($)", placeholder:"total cost", numberFormat:"111.00"},
            {cols:[
              {view:"button", value:"Cancel", css:"Webix_secondary", click:function(){$$("myModal").close()}},
              {view:"button", value:"Create", css:"Webix_primary", click:function(){
                if ($$("myForm").validate()) {
                  submit();
                }
              }},
            ]}
        ],
        rules: {
          "checkin": webix.rules.isNotEmpty,
          "nights": webix.rules.isNumber,
          "propid": webix.rules.isNotEmpty,
          "guestid": webix.rules.isNotEmpty,
          "total": webix.rules.isNumber,
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
    head: "New booking",
    headHeight: 35,
    position: "center",
    body: myform
  });
  modal.show();
};

// creates the bookings data table
function create_table() {
  if ($$("dtable")) 
    return;
  webix.ui({
    container: "bookingstable",
    position: "flex",
    rows:[
      {
        cols:[
          {
            id: "dtable",
            view: "datatable",
            editable: true,
            position: "flex",
            minHeight: 300,
            scrollX: false,
            scrollY: true,
            columns:[
                {id:"userid", hidden:true},
                {id:"propid", editor:"combo", options:properties, header:"Property", minWidth:100, fillspace:2, sort:"string"},
                {id:"guestid", editor:"combo", options:guests, header:"Guest", fillspace:true, sort:"string"},
                {id:"checkin", editor:"date", header:"Check-in date", minWidth:150, template:function(obj){
                  let myformat = webix.Date.dateToStr("%m/%d/%Y");
                  let date = myformat(format_date(obj.checkin));
                  return date + " <span class ='webix_icon mdi mdi-calendar-blank'></span>"
                }},
                {id:"nights", editor:"text", header:"Nights", minWidth:80, sort:"int", template:function(obj) {
                  return obj.nights + " nights";
                }},
                {id:"total", editor:"text", header:"Total ($)", minWidth:80, sort:"string", template:function(obj) {
                  let myformat = webix.Number.numToStr({
                    groupDelimiter:",", groupSize:3, decimalDelimiter:".", decimalSize:2
                  });
                  return "$" + myformat(obj.total);
                }},
                {id:"remove", header:"", width:50, tooltip:"Delete", template:function(obj){
                  return "<i class='mdi mdi-delete'></i>";}
                },
            ],
            on: {
              onAfterEditStop: function(state, editor, ignoreUpdate){
                  let item = this.getItem(editor.row);
                  if(state.value != state.old){
                      console.debug("update item", item);
                      subfork.data("bookings").update(item.id, item, function(resp) {
                          if (resp.success) {
                            update_calendar();
                          } else {
                            console.error(resp.message);
                            webix.message(resp.message, "error")
                          };
                      });
                  };
              },
              onItemClick: function (row, e, trg) {
                  let item = this.getItem(row);
                  if (row.column == "remove") {
                      let params = [["id", "=", item.id]];
                      webix.confirm("Delete booking?").then(function() {
                        subfork.data("bookings").delete(params, function(resp) {
                          if (resp.success) {
                            $$("dtable").remove(row);
                            update_calendar();
                          } else {
                            console.error(resp.message);
                            webix.message(resp.message, "error");
                          };
                        });
                      });
                  };
              },
            }
          },
          {
            id: "myCal",
            view: "calendar",
            on: {
              onAfterDateSelect: function(d) {
                create_form();
                $$("checkin").setValue(d);
              }
            }
          },
        ]
      },
    ]
  });

  // fetch bookings data for authenticated user
  console.log("loading data");
  const params = [["type", "=", "bookings"]];
  subfork.data("bookings").find(params, function(resp) {
    update_table(resp.data);
    console.log("done");
  });
};
