/*
* Copyright (c) 2013 DataTorrent, Inc. ALL Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
'use strict';

angular.module('datatorrent.mlhrTable.services.mlhrTableFilterFunctions', [])

.service('mlhrTableFilterFunctions', function() {

  function like(term, value) {
    term = term.toLowerCase().trim();
    value = value.toLowerCase();
    var first = term[0];

    // negate
    if (first === '!') {
      term = term.substr(1);
      if (term === '') {
        return true;
      }
      return value.indexOf(term) === -1;
    }

    // strict
    if (first === '=') {
      term = term.substr(1);
      return term === value.trim();
    }

    // remove escaping backslashes
    term = term.replace('\\!', '!');
    term = term.replace('\\=', '=');

    return value.indexOf(term) !== -1;
  }

  function likeFormatted(term, value, computedValue, row) {
    return like(term,computedValue,computedValue, row);
  }
  like.placeholder = likeFormatted.placeholder = 'string search';
  like.title = likeFormatted.title = 'Search by text, eg. "foo". Use "!" to exclude and "=" to match exact text, e.g. "!bar" or "=baz".';

  function number(term, value) {
    value = parseFloat(value);
    term = term.trim();
    var first_two = term.substr(0,2);
    var first_char = term[0];
    var against_1 = term.substr(1)*1;
    var against_2 = term.substr(2)*1;
    if ( first_two === '<=' ) {
      return value <= against_2 ;
    }
    if ( first_two === '>=' ) {
      return value >= against_2 ;
    }
    if ( first_char === '<' ) {
      return value < against_1 ;
    }
    if ( first_char === '>' ) {
      return value > against_1 ;
    }
    if ( first_char === '~' ) {
      return Math.round(value) === against_1 ;
    }
    if ( first_char === '=' ) {
      return against_1 === value ;
    }
    return value.toString().indexOf(term.toString()) > -1 ;
  }
  function numberFormatted(term, value, computedValue) {
    return number(term, computedValue);
  }
  number.placeholder = numberFormatted.placeholder = 'number search';
  number.title = numberFormatted.title = 'Search by number, e.g. "123". Optionally use comparator expressions like ">=10" or "<1000". Use "~" for approx. int values, eg. "~3" will match "3.2"';


  var unitmap = {};
  unitmap.second = unitmap.sec = unitmap.s = 1000;
  unitmap.minute = unitmap.min = unitmap.m = unitmap.second * 60;
  unitmap.hour = unitmap.hr = unitmap.h    = unitmap.minute * 60;
  unitmap.day = unitmap.d                  = unitmap.hour * 24;
  unitmap.week = unitmap.wk = unitmap.w    = unitmap.day * 7;
  unitmap.month                            = unitmap.week * 4;
  unitmap.year = unitmap.yr = unitmap.y    = unitmap.day * 365;

  var clauseExp = /(\d+(?:\.\d+)?)\s*([a-z]+)/;
  function parseDateFilter(string) {

    // split on clauses (if any)
    var clauses = string.trim().split(',');
    var total = 0;
    // parse each clause
    for (var i = 0; i < clauses.length; i++) {
      var clause = clauses[i].trim();
      var terms = clauseExp.exec(clause);
      if (!terms) {
        continue;
      }
      var count = terms[1]*1;
      var unit = terms[2].replace(/s$/, '');
      if (! unitmap.hasOwnProperty(unit) ) {
        continue;
      }
      total += count * unitmap[unit];
    }
    return total;
    
  }
  function date(term, value, returnBoundary) {
    // today
    // yesterday
    // 1 day ago
    // 2 days ago

    // < 1 day ago
    // < 10 minutes ago
    // < 10 min ago
    // < 10 minutes, 50 seconds ago
    // > 10 min, 30 sec ago
    // > 2 days ago
    // >= 1 day ago
    term = term.trim();
    if (!term) {
      return true;
    }
    value *= 1;
    var nowDate = new Date();
    var now = (+nowDate);
    var first_char = term[0];
    var other_chars = (term.substr(1)).trim();
    var lowerbound, upperbound;
    if ( first_char === '<' ) {
      lowerbound = now - parseDateFilter(other_chars);
      if (returnBoundary) {
        return {
          min: lowerbound
        };
      } else {
        return value > lowerbound;
      }
    }
    if ( first_char === '>' ) {
      upperbound = now - parseDateFilter(other_chars);
      if (returnBoundary) {
        return {
          max: upperbound
        };
      } else {
        return value < upperbound;
      }
    }
    
    if ( term === 'today') {
      if (returnBoundary) {
        now = +(new Date(nowDate.toDateString()));
        return {
          min: now,
          max: now + 86399999
        };
      } else {
        return new Date(value).toDateString() === nowDate.toDateString();
      }
    }

    if ( term === 'yesterday') {
      if (returnBoundary) {
        now = +(new Date(nowDate.toDateString()));
        return {
          min: now - 86400000,
          max: now
        };
      } else {
        return new Date(value).toDateString() === new Date(now - unitmap.d).toDateString();
      }
    }

    var supposedDate = new Date(term);
    if (!isNaN(supposedDate)) {
      if (returnBoundary) {
        return {
          min: +supposedDate,
          max: +supposedDate
        };
      } else {
        return new Date(value).toDateString() === supposedDate.toDateString();
      }
    }

    return false;
  }
  date.placeholder = 'date search';
  date.title = 'Search by date. Enter a date string (RFC2822 or ISO 8601 date). You can also type "today", "yesterday", "> 2 days ago", "< 1 day 2 hours ago", etc.';


  function stringToDuration(str) {

    function getVal(str) {
      var units = {
               y:       31536000000,
               ye:      31536000000,
               yea:     31536000000,
               year:    31536000000,
               years:   31536000000,
               mo:      2592000000,
               mon:     2592000000,
               mont:    2592000000,
               month:   2592000000,
               months:  2592000000,
               w:       604800000,
               we:      604800000,
               wee:     604800000,
               week:    604800000,
               weeks:   604800000,
               d:       86400000,
               da:      86400000,
               day:     86400000,
               days:    86400000,
               h:       3600000,
               ho:      3600000,
               hou:     3600000,
               hour:    3600000,
               hours:   3600000,
               mi:      60000,
               min:     60000,
               minu:    60000,
               minut:   60000,
               minute:  60000,
               minutes: 60000,
               '':      1000,     // no unit should default to second
               s:       1000,
               se:      1000,
               sec:     1000,
               seco:    1000,
               secon:   1000,
               second:  1000,
               seconds: 1000
             };
      // ary[2] should be the number (allowing decimal)
      // ary[4] should be the unit
      var ary = str.match(/^( *)(\d+\.?\d*|\d*\.?\d+)( *)(y|ye|yea|year|years|mo|mon|mont|month|months|w|we|wee|week|weeks|d|da|day|days|h|ho|hou|hour|hours|mi|min|minu|minut|minute|minutes|s|se|sec|seco|secon|second|seconds| *)( *$)/i);
      if (ary) {
        // the expression was a number and one of the units above
        return ary[2] * units[ary[4]];
      }

      // got here means the expression could be in the hh:mm:ss format
      // ary[2] should be the hours
      // ary[3] should be the minutes
      // ary[4] should be the seconds (if exist)
      ary = str.match(/(^ *)(\d\d|\d)(:\d\d)(:\d\d)?( *$)/);
      if (ary && ary[4]) {
        return ary[2] * units.hours + ary[3].substr(1) * units.minutes + ary[4].substr(1) * units.seconds;
      } else if (ary) {
        return ary[2] * units.hours + ary[3].substr(1) * units.minutes;
      }

      // got here means the expression is not recognized
      return NaN;
    }
    // end getVal function


    var val = 0;
    if (str) {
      var ary = str.split(',');
      for(var i = 0; i < ary.length; i++) {
        val += getVal(ary[i]);
      }
    }
    return val;
  }

  function duration(term, value) {

    if (typeof value !== 'number' || isNaN(value)) {
      // we expect value to be a number and in milliseconds
      return false;
    }

    // default filter to true to show the row
    var filterState = true;

    // break expressions into groups delimited by ampersand (&)
    var termArray = term.split('&');

    var ary,
        operator,
        exp,
        filterValue;

    // loop through each expression and perform the comparison
    // we'll exit the loop if the filterState becomes false
    // false means one of the expressions does not yield a
    // true condition
    for(var i = 0; i < termArray.length && filterState; i++) {
      // parse operands and expression
      // ary[2] should be the operator
      // ary[4] should be the expression
      ary = termArray[i].match(/^( *)(<=|>=|>|<|=| *)( *)(.*)/);

      if (ary) {
        operator = ary[2] || '=';   // default to equal sign if user doesn't enter an operator
        exp = ary[4];

        if (exp && !isNaN(filterValue = stringToDuration(exp))) {
          // now compare the row value with the expression entered by the user
          if (operator === '<=') {
            filterState = value <= filterValue;
          } else if (operator === '>=') {
            filterState = value >= filterValue;
          } else if (operator === '>') {
            filterState = value > filterValue;
          } else if (operator === '<') {
            filterState = value < filterValue;
          } else if (operator === '=') {
            filterState = value === filterValue;
          }
        } else {
          // expression is invalid, return false to hide row
          return false;
        }
      }
    }

    return filterState;
  }
  function durationFormatted(term, value, formatted) {
    return duration(term, stringToDuration(formatted));
  }
  duration.placeholder = durationFormatted.placeholder = 'duration search';
  duration.title = durationFormatted.title = 'Search by duration, e.g.:\n"<= 30 minutes",\n"= 1 hour",\n">= 1 day, 4 hours" or\n "> 2.5 days & < 3 days".\nDefault operator is "=" and unit is "second".\nThus searching "60", "60 seconds", or "= 60" are equivalent to "= 60 seconds".';


  function stringToMemory(str, toUnit) {

    function getVal(str) {
      var units = {
            bb: 1.2379400392853803e+27,
            yb: 1.2089258196146292e+24,
            zb: 1.1805916207174113e+21,
            eb: 1152921504606847000,
            pb: 1125899906842624,
            tb: 1099511627776,
            gb: 1073741824,
            '': 1048576,          // default unit is MB
            mb: 1048576,
            kb: 1024,
            b: 1
          };
      // ary[2] should be the number (allowing decimal)
      // ary[4] should be the unit
      var ary = str.match(/^( *)(\d+\.?\d*|\d*\.?\d+)( *)(b|kb|mb|gb|tb|pb|eb|zb|yb|bb| *)( *$)/i);
      if (ary) {
        // the expression was a number and one of the units above
        return ary[2] * units[ary[4].toLowerCase()] / units[(toUnit || 'b').toLowerCase()];
      }

      // got here means the expression is not recognized
      return NaN;
    }
    // end getVal function


    var val = 0;
    if (str) {
      var ary = str.split(',');
      for(var i = 0; i < ary.length; i++) {
        val += getVal(ary[i]);
      }
    }
    return val;
  }

  function memory(term, value) {

    if (typeof value !== 'number' || isNaN(value)) {
      // we expect value to be a number and in bytes
      return false;
    }

    // default filter to true to show the row
    var filterState = true;

    // break expressions into groups delimited by ampersand (&)
    var termArray = term.split('&');

    var ary,
        operator,
        exp,
        filterValue;

    // loop through each expression and perform the comparison
    // we'll exit the loop if the filterState becomes false
    // false means one of the expressions does not yield a
    // true condition
    for(var i = 0; i < termArray.length && filterState; i++) {
      // parse operands and expression
      // ary[2] should be the operator
      // ary[4] should be the expression
      ary = termArray[i].match(/^( *)(<=|>=|>|<|=| *)( *)(.*)/);

      if (ary) {
        operator = ary[2] || '=';   // default to equal sign if user doesn't enter an operator
        exp = ary[4];

        if (exp && !isNaN(filterValue = stringToMemory(exp))) {
          // now compare the row value with the expression entered by the user
          if (operator === '<=') {
            filterState = value <= filterValue;
          } else if (operator === '>=') {
            filterState = value >= filterValue;
          } else if (operator === '>') {
            filterState = value > filterValue;
          } else if (operator === '<') {
            filterState = value < filterValue;
          } else if (operator === '=') {
            filterState = value === filterValue;
          }
        } else {
          // expression is invalid, return false to hide row
          return false;
        }
      }
    }

    return filterState;
  }
  function memoryFormatted(term, value, formatted) {
    return memory(term, stringToMemory(formatted));
  }
  memory.placeholder = memoryFormatted.placeholder = 'memory search';
  memory.title = memoryFormatted.title = 'Search by memory using expressions, e.g.\n"> 512mb", "= 1.5GB", or\n">= 128GB & <= 256GB".\nUnits are not case sensitive.\nDefault operator is "=" and unit is "MB".\nThus searching "128", "= 128" or "128 MB" are equivalent to "= 128 MB".';

  return {
    like: like,
    likeFormatted: likeFormatted,
    number: number,
    numberFormatted: numberFormatted,
    date: date,
    duration: duration,
    durationFormatted: durationFormatted,
    stringToDuration: stringToDuration,
    memory: memory,
    memoryFormatted: memoryFormatted,
    stringToMemory: stringToMemory
  };
});