//
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
//
var Calendar = Class.create();
Calendar.prototype = {
  VERSION            : '1.2',
  // Calendar Navigation
  NAV_PREVIOUS_YEAR  : -2,
  NAV_PREVIOUS_MONTH : -1,
  NAV_TODAY          :  0,
  NAV_NEXT_MONTH     :  1,
  NAV_NEXT_YEAR      :  2,
  // DOM 
  parentElement      : null,
  triggerElement     : null,
  dateField          : null,
  // Event Handlers - Callbacks
  selectHandler     : null,
  closeHandler      : null,
  // The HTML Container Element
  container          : null,
  table              : null,
  // Configuration
  minYear            : 1900,
  maxYear            : 2100,
  dateFormat         : '%Y-%m-%d',
  // Dates
  date               : null,
  currentDateElement : null,
  // Status
  embedded           : false,
  shouldClose        : false,
  // Only allow dates in the future
  futureOnly         : false,
  //----------------------------------------------------------------------------
  // Initialize
  //----------------------------------------------------------------------------
  initialize : function(element, options) {
    this.element = $(element);
    Object.extend(this, options);

    this.element.identify();
    this.dateField = this.dateField ? this.dateField : this.element.down('input');
    this.triggerElement = $(this.triggerElement);
    this.container = new Element('div',{
      'class' : 'calendarview-calendar'
    });
    this.container.identify();
    if (this.parentElement)
      this.embedded = true;
    
    // A wrapper around the input/div that the calendar is being attached to. Sticky working out
    // the style and layout issues this can (will) cause if used as is.
    
    // if (!this.element.up().hasClassName('calenderviewable-outer')) {
    //   var _div = new Element('div', { 'class' : 'calenderviewable-outer' });
    // 
    //   $(_div).setStyle({
    //     style : 'z-index:1',
    //     position : 'relative'
    //   });
    //   Element.wrap(this.element, _div);
    // }

    if (this.futureOnly) {
      var d = new Date();
      this.minYear  = parseInt(d.print('%Y'),10);
      this.minMonth = parseInt(d.print('%m'),10)-1;
    }
    
    this.date = new Date();
    this.setupCalendar();
    this.setupBehaviors();
  },
  
  setupBehaviors : function () {
    if (!this.embedded) {
      this.element.calendar.observe('click', this.displayDateSelect.bindAsEventListener(this));
      if (this.triggerElement) this.triggerElement.observe('click', this.callShowHandler.bindAsEventListener(this));
    }
    if (this.element.calendar) this.element.calendar.observe('click', this.handleSelect.bindAsEventListener(this));
  },

  displayDateSelect : function (e) {
    if (!this.element.calendar.visible() && !this.embedded) {
      this._ensureCorrect(e);
    }
    if (e) e.stop();
  },
  
  _ensureCorrect : function (e) {
    if (!this.embedded) {
      this.parseDate(this.dateField.value);
    }
  },

  setupCalendar : function () {
    // Create Calendar
    this.createCalendar();
    this.container.insert({bottom: this.table});
    this.element.calendar = this.container;

    if (!this.embedded) {
      this.container.setStyle({ position: 'absolute', display: 'none' });
      this.container.addClassName('calendarview-popup');
      this.element.insert({after : this.container});
    } else {
      $(this.parentElement).update(this.container);
    }
  },
  
  handleSelect : function (e) {
    if (e.element().hasClassName('calendarview-past') && 
        this.futureOnly ||
        e.element().up().hasClassName('calendarview-days-of-the-week')) {
    } else {
      this.setCalendarDisplay(e);
    }
  },

  setCalendarDisplay : function(e) {
    var el = e.element();
    this.isNewDate = false;

    if (el.descendantOf(this.element.calendar)) {
      // Clicked on a day
      if (el.up('tr').hasClassName('calendarview-days')) {
        if (this.currentDateElement) {
          this.currentDateElement.removeClassName('calendarview-selected');
          el.addClassName('calendarview-selected');
          this.shouldClose = (this.currentDateElement === el);
          if (!this.shouldClose) this.currentDateElement = el;
        }
        this.currentDateElement = el;
        this.date.setDateOnly(el.date);
        this.updateCalendar(this.date);
        this.callSelectHandler();
      } else {                                                             
        this.calendarNavAction(el);
      }
    }
  },

  defaultSelectHandler : function() {
    if (this.dateField) {
      var _field = $(this.dateField);
      // Update dateField value
      switch(_field.tagName){
      case 'DIV':
      case 'SPAN':
        _field.innerHTML = this.date.print(this.dateFormat);
        break;
      case 'INPUT':
        _field.value = this.date.print(this.dateFormat);
        break;
      default:
      }
      // Trigger the onchange callback on the dateField, if one has been defined
      if (typeof this.dateField.onchange == 'function')
        this.dateField.onchange();
      if (!this.embedded) this.shouldClose = true;
      // Call the close handler, if necessary
      if (this.shouldClose)
        this.callCloseHandler();
    }
  },
  //----------------------------------------------------------------------------
  // Create/Draw the Calendar HTML Elements
  //----------------------------------------------------------------------------
  createCalendar : function() {
    this.table = new Element('table');  // Calendar Table

    var thead  = new Element('thead'),  // Calendar Header
        row    = new Element('tr'),     // Title Placeholder
        cell   = new Element('th', { colSpan: 7 } );

    this.table.appendChild(thead);

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
    var tbody = this.table.appendChild(new Element('tbody'));
    for (i = 6; i > 0; --i) {
      row = tbody.appendChild(new Element('tr'));
      row.addClassName('calendarview-days');
      for (var j = 7; j > 0; --j) {
        cell = row.appendChild(new Element('td'));
        cell.calendar = this;
      }
    }
    this.element.table = this.table;
    // Initialize Calendar
    this.updateCalendar(this.date);
  },
  //----------------------------------------------------------------------------
  // Update / (Re)initialize Calendar
  //----------------------------------------------------------------------------
  updateCalendar : function(date) {
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
    this.table.select('tbody tr').each(
      function(row, i) {
        var rowHasDays = false;
        row.immediateDescendants().each(
          function(cell, j) {
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
              this.currentDateElement = cell;
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
          }
        );
        // Hide the extra row if it contains only days from another month
        !rowHasDays ? row.hide() : row.show();
      }
    );

    this.table.select('th.calendarview-title')[0].update(
      Date.CONSTANTS.MONTH_NAMES[month] + ' ' + this.date.getFullYear()
    );

  },
  //------------------------------------------------------------------------------
  // Miscellaneous
  //------------------------------------------------------------------------------

  // Tries to identify the date represented in a string.  If successful it also
  // calls this.setCalendarDate which moves the calendar to the given date.
  parseDate: function(str, format) {
    if (!format)
      format = this.dateFormat;
    this.setCalendarDate(Date.parseDate(str, format));
  },
  //------------------------------------------------------------------------------
  // Getters/Setters
  //------------------------------------------------------------------------------  
  setCalendarDate : function(date) {
    if (!date.equalsTo(this.date))
      this.updateCalendar(date);
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
  //------------------------------------------------------------------------------
  // Callbacks
  //------------------------------------------------------------------------------
  callShowHandler : function () {
    if (this.showHandler) this.showHandler();
    this.showCalendar();
  },
  // Calls the Select Handler (if defined)
  callSelectHandler : function() {
    if (this.selectHandler) this.selectHandler(this, this.date.print(this.dateFormat));
    this.defaultSelectHandler();
  },
  // Calls the Close Handler (if defined)
  callCloseHandler : function() {
    if (this.closeHandler) this.closeHandler(this);
    this.hideCalendar();
  },
  //------------------------------------------------------------------------------
  // Calendar Display Functions
  //------------------------------------------------------------------------------

  // Shows the Calendar
  showCalendar : function() {
    if (!this.embedded) {
      this.element.calendar.show();
      // So the _checkCalendar isn't created over and over again when the calendar is shown.
      // See http://api.prototypejs.org/language/function/prototype/bind/
      this.element.boundHandlerMethod = this._checkCalendar.bind(this);
      document.observe("click", this.element.boundHandlerMethod);
    }
  },
  // Hides the Calendar
  hideCalendar : function() {
    if (!this.embedded) {
      this.element.calendar.hide();
      if (this.element.boundHandlerMethod) document.stopObserving("click", this.element.boundHandlerMethod);
    }
  },
  //------------------------------------------------------------------------------
  // Static Methods
  //------------------------------------------------------------------------------

  // This gets called when the user clicks anywhere in the
  // document, if the calendar is shown. If the click was outside the open
  // calendar, triggerElement, or container this function closes it.
  _checkCalendar : function(e) {
    if (e.element() != this.triggerElement &&
        e.element() != this.element && 
        e.element() != this.dateField && 
       !e.element().descendantOf(this.element.calendar)) {
      if (!this.embedded) this.callCloseHandler();
    }
  },
  // This createthe row of navigations elements below the month name in the calendar.
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

};

// FIXME: Do some Object instantiation options voodoo
//        because this is ugly and brittle.

// Editable class methods.
Object.extend(Calendar, {
    options: {
        // dateField: '',
        // triggerElement: ''
    },
    create: function(element) {
        new Calendar(element, {
          dateField: element.down('input'),
          triggerElement: element.down('input')
        });
    },

    setupAll: function(klass) {
        klass = klass || '.calendarview-calendar';
        $$(klass).each(Calendar.create);
    }
});
// Helper method for event delegation
Element.addMethods({
  calendarviewable: function(element, options) {
    new Calendar(element, options);
  }
});
