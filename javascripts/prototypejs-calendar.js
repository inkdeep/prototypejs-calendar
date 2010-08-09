//---------------------------------------------------------------------------
// CalendarView[REMIX] (for Prototype)
//
//
// Maintained by Justin Mecham <justin@aspect.net>
// Portions Copyright 2002-2005 Mihai Bazon
//
// This calendar is based very loosely on the Dynarch Calendar in that it was
// used as a base, but completely gutted and more or less rewritten in place
// to use the Prototype JavaScript library…
//
// …AND then really hacked and slashed to make attaching multiple calendars on
// a page, limiting date selection to the future only, doing calendar instantization
// through even delegation, and some other tweaks.
//
// As such, CalendarView is licensed under the terms of the GNU Lesser General
// Public License (LGPL). More information on the Dynarch Calendar can be
// found at:
//
//   www.dynarch.com/projects/calendar
//---------------------------------------------------------------------------
var Calendar = Class.create({/*
  Calendar Navigation           DOM                         Configuration*/
  NAV_PREVIOUS_YEAR   : -2,     parentElement   : null,     minYear     : 1900,
  NAV_NEXT_MONTH      :  1,     dateField       : null,     maxYear     : 2100,
  NAV_PREVIOUS_MONTH  : -1,     tableContainer  : null,     dateFormat  : '%Y-%m-%d',
  NAV_NEXT_YEAR       :  2,     table           : null,     embedded    : false,
  NAV_TODAY           :  0,                                 shouldClose : false,/*
  Dates                         Event Handlers/Callbacks    Future dates only?*/
  date                : null,   selectHandler   : null,     futureOnly  : false,
  currentDateElement  : null,   closeHandler    : null,
  //---------------------------------------------------------------------------
  // Initialize
  //---------------------------------------------------------------------------
  initialize : function(element, options) {
    this.element = element;
    Object.extend(this, options);
    // if there is an explicit parentElement
    if (this.parentElement) this.embedded = true;
    // if only want future dates selected
    if (this.futureOnly) {
      var d = new Date();
      this.minYear  = parseInt(d.print('%Y'),10);
      this.minMonth = parseInt(d.print('%m'),10)-1;
    }
    this.date = new Date();
    this.setupCalendar();
    this.addListeners();
  },
  // Tries to identify the date represented in a string.  If successful it also
  // calls this.setCalendarDate which moves the calendar to the given date.
  parseDate: function(str, format) {
    if (!format)
      format = this.dateFormat;
      var _date = Date.parseDate(str, format);
    if (typeof _date === Date) this.setCalendarDate(_date);
  },

  setupCalendar : function () {
    this.calendar = new Element('div',{
      'class' : 'calendarview-calendar'
    });
    this.calendar.dateField = this.calendar.dateField || (this.dateField ? $(this.dateField) : this.element.down('input'));
    this.calendar.originalDate = this.calendar.dateField ? this.calendar.dateField.value || this.calendar.dateField.innerHTML : '';
    this.parseDate(this.calendar.originalDate);
    // Create Calendar
    this._create();
    if (!this.embedded) {
      this.calendar.setStyle({ position: 'absolute', display:'none' });
      this.calendar.addClassName('calendarview-popup');
      this.element.insert(this.calendar);
      if (this.activated) this._display();
    } else {
      $(this.parentElement).update(this.calendar);
    }
    // Initialize Calendar
    this._refresh(this.date);
  },
  //---------------------------------------------------------------------------
  // Create/Draw the Calendar HTML Elements
  //---------------------------------------------------------------------------
  _create : function() {
    var table = new Element('table'),  // Calendar Table
        thead = new Element('thead'),  // Calendar Header
        row   = new Element('tr'),     // Title Placeholder
        cell  = new Element('th', { colSpan: 7 } );

    table.appendChild(thead);

    cell.addClassName('calendarview-title');
    row.appendChild(cell);
    thead.appendChild(row);
    // Calendar Navigation
    row = new Element('tr');
    row.className = 'calendarview-buttons';
    this._drawButtonCell(row, '&#x00ab;', 1, this.NAV_PREVIOUS_YEAR, 'Back One Year');
    this._drawButtonCell(row, '&#x2039;', 1, this.NAV_PREVIOUS_MONTH, 'Back One Month');
    this._drawButtonCell(row, 'Today',    3, this.NAV_TODAY, 'Todays Date');
    this._drawButtonCell(row, '&#x203a;', 1, this.NAV_NEXT_MONTH, 'Forward One Month');
    this._drawButtonCell(row, '&#x00bb;', 1, this.NAV_NEXT_YEAR, 'Forward One Year');
    this.navButtons = row;
    thead.appendChild(row);
    // Day Names
    row = new Element('tr');
    row.addClassName('calendarview-days-of-the-week');
    for (var i = 0; i < 7; ++i) {
      cell = new Element('th').update(Date.CONSTANTS.SHORT_DAY_NAMES[i]);
      if (i == 0 || i == 6)
        cell.addClassName('calendarview-weekend');
      row.appendChild(cell);
    }
    thead.appendChild(row);
    // Calendar Days
    var tbody = table.appendChild(new Element('tbody'));
    for (i = 6; i > 0; --i) {
      row = tbody.appendChild(new Element('tr'));
      row.addClassName('calendarview-days');
      for (var j = 7; j > 0; --j) {
        cell = row.appendChild(new Element('td'));
        cell.calendar = this;
      }
    }
    this.calendar.table = table;
    this.calendar.update(table);
  },
  //---------------------------------------------------------------------------
  // Update / (Re)initialize Calendar
  //---------------------------------------------------------------------------
  _refresh : function(date) {
    var today      = new Date(),
        thisYear   = today.getFullYear(),
        thisMonth  = today.getMonth(),
        thisDay    = today.getDate(),
        month      = date.getMonth(),
        dayOfMonth = date.getDate();

    // Ensure date is within the defined range
    if (date.getFullYear() < this.minYear)
      date.setFullYear(this.minYear);
    else if (date.getFullYear() > this.maxYear)
      date.setFullYear(this.maxYear);

    this.date = new Date(date);
    // Calculate the first day to display (including the previous month)
    date.setDate(1);
    date.setDate(-(date.getDay()) + 1);

    var _future_only = this.futureOnly;
    // Fill in the days of the month
    this.calendar.table.select('tbody tr').each(function(row, i) {
      var rowHasDays = false;
      row.immediateDescendants().each(function(cell, j) {
        var day            = date.getDate(),
            dayOfWeek      = date.getDay(),
            isCurrentMonth = date.getMonth() == month;
        // Reset classes on the cell
        cell.date          = new Date(date);
        cell.writeAttribute({'class' : ''});
        cell.update(day);

        if (date <= today && _future_only) {
           cell.addClassName('calendarview-past');
        }
        // Account for days of the month other than the current month
        if (!isCurrentMonth) {
          cell.addClassName('calendarview-otherDay');
        } else {
          rowHasDays = true;
        }
        // Ensure the dateField values day is selected
        if (isCurrentMonth && day == dayOfMonth) {
          cell.addClassName('calendarview-selected');
          this.calendar.currentDateElement = cell;
        }
        // Today
        if (date.getFullYear() == thisYear && date.getMonth() == thisMonth && day == thisDay)
          cell.addClassName('calendarview-today');
        // Weekend
        if ([0, 6].indexOf(dayOfWeek) != -1){
          cell.addClassName('calendarview-weekend');
        }
        // Set the date to tommorrow
        date.setDate(day + 1);
      }.bind(this));
      // Hide the extra row if it contains only days from another month
      !rowHasDays ? row.hide() : row.show();
    }.bind(this));

    this.calendar.table.select('th.calendarview-title')[0].update(
      Date.CONSTANTS.MONTH_NAMES[month] + ' ' + this.date.getFullYear()
    );
  },
  //---------------------------------------------------------------------------
  // Event Listeners
  //---------------------------------------------------------------------------
  addListeners : function () {
    if (!this.embedded) {
      this.element.observe('click', this._display.bind(this));
    }
    this.calendar.observe('click', this._select.bind(this));
  },
  //---------------------------------------------------------------------------
  // Calendar Display Functions
  //---------------------------------------------------------------------------
  _display : function (e) {
    this._show();
    this.boundHandlerMethod = this._checkCalendar.bindAsEventListener(this);
    document.observe("click", this.boundHandlerMethod);
    // if (e) e.stop(); <--- WILL KILL EVENT BUBBLING - hence kill any delegated listeners higher in the document tree.
    // So stopping this event if action handling is delegated is not desired behavior. Checking for an attribute on the object 
    // the calendar instance is attached to when calling the constructor will prevent duplicate instances but let the 
    // event go all the way up. An example style using the delegate.js file used in the example html file:
    //
    //  '.date-field' : function (e) {
    //    this is done because the event may have happened on a child of the one we want to handle the event.
    //    var el = e.findElement('.date-field');
    //      // Since the event is stopped when we create and display the calendar when there are two or more delegated calendars 
    //      // all can open at the same time because the document listener never gets called ss
    //      if (!el.calendar) {
    //        el.calendar = true;
    //        el.calendarviewable({
    //          'activated': true,
    //          'futureOnly': true,
    //          'dateFormat': '%A %b %O, %Y'
    //        });
    //      }
    //    }
    //
    // The main reason this is done is to allow other calendars on the page to close if another calendar is on the page when
    // using an event delegation scenario when multiple calendars can be on one page.
    return true;
  },

  _select : function (e) {
    var el = e.findElement();
    if (el.hasClassName('calendarview-past') &&
        this.futureOnly ||
        el.up().hasClassName('calendarview-days-of-the-week')) {
          // return false;
    } else {
      this._update(e);
    }
  },

  _update : function(e) {
    var el = e.findElement();
    this.isNewDate = false;

    if (el.descendantOf(this.calendar)) {
      // Clicked on a day
      if (el.up('tr').hasClassName('calendarview-days')) {
        if (this.calendar.currentDateElement) {
          this.calendar.currentDateElement.removeClassName('calendarview-selected');
          el.addClassName('calendarview-selected');
          this.shouldClose = (this.calendar.currentDateElement === el);
          if (!this.shouldClose) this.calendar.currentDateElement = el;
        }
        this.calendar.currentDateElement = el;
        this.date.setDateOnly(el.date);
        this._refresh(this.date);
        this.callSelectHandler(e);
      } else {
        this.calendarNavAction(el);
      }
    }
  },
  // Shows the Calendar
  _show : function() {  
    if (!this.embedded) {
      this.calendar.show();
    }
    return true;
  },
  // Hides the Calendar
  _hide : function(e) {
    if (!this.embedded) {
      this.calendar.hide(); 
    }
    if (e) e.stop();
  },

  defaultSelectHandler : function(e) {
    if ((_field = this.calendar.dateField)) {
      // Update dateField value
      switch(_field.tagName){
      case 'DIV':
      case 'SPAN':
        _field.innerHTML = this.date.print(this.dateFormat);
        break;
      case 'INPUT':
        _field.value = this.date.print(this.dateFormat);
        break;
      }
      // Trigger the onchange callback on the dateField, if one has been defined
      // if (typeof this.calendar.dateField.onchange == 'function')
        // this.calendar.dateField.onchange();
      if (!this.embedded) this.shouldClose = true;
      // Call the close handler, if necessary
      if (this.shouldClose)
        this.callCloseHandler(e);
    }
  },
  //---------------------------------------------------------------------------
  // Getters/Setters
  //---------------------------------------------------------------------------
  setCalendarDate : function(date) {
    if (!date.equalsTo(this.date))
      this._refresh(date);
  },

  calendarNavAction : function (el) {
    // Clicked on an action button
    var date = new Date(this.date);

    if (el.navAction == this.NAV_TODAY)
      date.setDateOnly(new Date());

    var year  = date.getFullYear(),
        mon   = date.getMonth();
    function setMonth(m) {
      var day = date.getDate(),
          max = date.getMonthDays(m);
      if (day > max) {
        date.setDate(max);
      };
      date.setMonth(m);
    }
    switch (el.navAction) {
      // Previous Year
      case this.NAV_PREVIOUS_YEAR:
        if (year > this.minYear) {
          date.setFullYear(year -= 1);
        }
        break;
      // Previous Month
      case this.NAV_PREVIOUS_MONTH:
        if (mon > 0 && !this.futureOnly || mon > 0 && mon > this.minMonth) {
          setMonth(mon -= 1);
        }
        else if ((year -= 1) > this.minYear) {
          date.setFullYear(year);
          setMonth(11);
        }
        break;
      // Today
      case this.NAV_TODAY:
        break;
      // Next Month
      case this.NAV_NEXT_MONTH:
        if (mon < 11) {
          setMonth(mon += 1);
        }
        else if (year < this.maxYear) {
          date.setFullYear(year += 1);
          setMonth(0);
        }
        break;
      // Next Year
      case this.NAV_NEXT_YEAR:
        if (year < this.maxYear) {
          date.setFullYear(year += 1);
        }
        break;
    }
    if (!date.equalsTo(this.date)) {
      this.setCalendarDate(date);
      this.isNewDate = true;
    } else if (el.navAction == 0) {
      this.isNewDate = (this.shouldClose = true);
    }
  },
  //---------------------------------------------------------------------------
  // Callbacks
  //---------------------------------------------------------------------------
  callShowHandler : function () {
    if (this.showHandler) this.showHandler();
    this._show();
  },
  // Calls the Select Handler (if defined)
  callSelectHandler : function(e) {
    if (this.selectHandler) this.selectHandler(this, this.date.print(this.dateFormat));
    this.defaultSelectHandler(e);
  },
  // Calls the Close Handler (if defined)
  callCloseHandler : function(e) {
    if (this.closeHandler) this.closeHandler(this);
    this._hide(e);
    // if (e) e.stop();
  },
  //---------------------------------------------------------------------------
  // Static Methods
  //---------------------------------------------------------------------------

  // This gets called when the user clicks anywhere in the
  // document, if the calendar is shown. If the click was outside the open
  // calendar this function closes it.
  _checkCalendar : function(e) {
    el = e.findElement();
    if (!this.element || !el.descendantOf(this.element) && !this.embedded) {
      this.calendar.hide();
    }
  },
  // This creates the row of navigations elements below the month name in the calendar.
  _drawButtonCell : function(row, text, colSpan, navAction, titleText) {
    var cell          = new Element('th');
    if (colSpan > 1) {
      cell.colSpan = colSpan;
    };
    cell.className    = 'calendarview-button';
    cell.title        = titleText;
    cell.calendar     = this;
    cell.navAction    = navAction;
    cell.innerHTML    = text;
    cell.unselectable = 'on'; // IE
    row.appendChild(cell);
    return cell;
  }
});

// Calendar class methods.
Object.extend(Calendar, {
    options: {
    },
    create: function(element,field) {
      console.log('[prototypejs-calendar.js:424] arguments: ',arguments);
      console.log('[prototypejs-calendar.js:425] element: ',element);
      new Calendar(element, {
        dateField: element.down(field)
      });
    },
    // Create a calendar for each element with the matching class.
    setupAll: function(klass,field) {
      klass = klass || '.calendarview-calendar';
      $$(klass).each(function(element){Calendar.create(element,field)});
    }
});
// Helper method for event delegation
Element.addMethods({
  calendarviewable: function(element, options) {
    new Calendar(element, options);
  }
});
