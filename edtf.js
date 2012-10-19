(function (exports) {
  var tokenGroups = {
    approximate: [
      /^c(?:irc)?a?$/,
      /^about$/,
      /^around$/,
      /^roughly$/,
      /^~$/
    ],
    uncertain: [
      /^\?$/
    ],
    indicators: [
      /^in$/i,
      /^on$/i,
      /^from$/i,
      /^to$/i
    ],
    year: [
      // Only works for years 1000 to 2999. That's okay for me.
      /^[12][0-9]{3}$/
    ],
    months: [
      /^jan(?:uary)?$/i,
      /^feb(?:ruary)?$/i,
      /^mar(?:ch)?$/i,
      /^apr(?:il)?$/i,
      /^may$/i,
      /^jun(?:e)?$/i,
      /^jul(?:y)?$/i,
      /^aug(?:ust)?$/i,
      /^sep(?:t|tember)?$/i,
      /^oct(?:ober)?$/i,
      /^nov(?:ember)?$/i,
      /^dec(?:ember)?$/i
    ],
    seasons: [
      /^spr(?:ing)?$/i,
      /^sum(?:mer)?$/i,
      /^(?:aut|autumn|fall)$/i,
      /^win(?:ter)?$/i
    ]
  }
  
  /**
   * Find the first match between a list of tokens and a list of regexs.
   *
   * @param tokens {String|String[]} String(s) to be searched
   * @param regexArray {RegExp[]} Expressions for strings to be tested against
   *
   * @returns False if no match, otherwise an object of the matched string and
   *     the index of the regex pattern in the regexArray
   *
   */
  function matchInArray(tokens, regexArray) {
    var match = false
      , idx
      , tokenArray = typeof(tokens) === 'string' ? [tokens] : tokens;
    for (var i = 0; i < tokenArray.length; i++) {
      for (idx = 0; idx < regexArray.length; idx++) {
        if (regexArray[idx].test(tokenArray[i])) {
          match = '' + tokenArray[i];
          break;
        }
      }
      if (match) break;
    }
    return match && {
      'token': match,
      'index': idx
    }
  }

  function zeroPadded(i) {
    var j = i;
    while (('' + j).length < 2) {
      j = '0' + j;
    }
    return j;
  }

  function numericalTokens(tokens) {
    var numericalTokens = [];
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i].match(/^[0-9]+$/)) {
        numericalTokens.push(tokens[i]);
      }
    }
    return numericalTokens;
  }

  /**
   * Match list of tokens against regexes for years
   */
  function getYear(tokens) {
    var y = matchInArray(tokens, tokenGroups.year);
    return y && y.token;
  }

  /**
   * Given a list of tokens (year removed), return the month
   *
   * @returns {Object} Month as represented by 01-12, as well as the token of
   *     the month in the list of tokens (e.g. May, Summer, Sep., 3)
   */
  function getMonth(tokens, monthFirst) {
    var month
      , monthToken
      , m
      , months = tokenGroups.months
      , seasons = tokenGroups.seasons
      , numericalTokens = numericalTokens(tokens)

    if (numericalTokens.length === 2) {
      month = monthToken = tokens[monthFirst ? 0 : 1];
    } else if (numericalTokens.length === 1 && tokens.length > 1 || numericalTokens.length === 0) {
      // The month is represented by a string, not a number. Loop through the
      // arrays of regexes for months & season until there is a match.
      while (true) {
        m = matchInArray(tokens, months);
        if (m) {
          month = m.index + 1;
          monthToken = m.token;
          break;
        }
        m = matchInArray(tokens, seasons);
        if (m) {
          month = m.index + 21;
          monthToken = m.token;
        }
        break;
      }
    } else if (numericalTokens.length === 1 && tokens.length === 1) {
      month = monthToken = tokens[0];
    }
    return month && {
      month: zeroPadded(month),
      token: monthToken
    }
  }

  function getDay(tokens) {
    var day
      , dayToken
      , numericalTokens = numericalTokens(tokens)

    if (numericalTokens.length === 1) {
      day = dayToken = (
        1 <= parseInt(numericalTokens[0], 10) <= 31
          ? numericalTokens[0] 
          : undefined);
    }

    return day && {
      day: zeroPadded(day),
      token: dayToken
    }
  }

  /**
   * Check if a day actually existed
   *
   * The reason I'm setting the year as 2012 initially is that the javascript
   * date parser does a lot of weird things. According the the article linked
   * below, feeding it a string with the format yyyy/mm/dd is the only cross-
   * browser way to consistently get the same date without timezone-massaging
   * confusing. However, I've noticed (yes, this is a fringe case) that this
   * format doesn't work for the years 0000-0099, which are parsed as 1900-
   * 1999. It works for the years -0000 through -0099, though. Go figure.
   * (tested in firefox 16)
   *
   * http://blog.dygraphs.com/2012/03/javascript-and-dates-what-mess.html
   */
  function wasADate(year, month, day) {
    var verdict
      , date
      , y = parseInt(year.replace('y', ''), 10)

    if (y < -271820 || y > 275759) {
      // This is the limit for javascript's Date implementation. Too bad, if
      // you're doing some kind of social history for science fiction communities
      //
      // console.log(new Date('275760/09/12'), new Date('275760/09/13'))
      // http://www.merlyn.demon.co.uk/js-datex.htm
      return true;
    }

    date = new Date('2012/' + month + '/' + day);
    date.setFullYear(y);

    verdict = y === date.getFullYear();
    verdict = parseInt(month, 10) === date.getMonth() + 1;
    verdict = parseInt(day, 10) === date.getDate();

    return !!verdict;
  }

  var EDTFDate = function (data) {

    this.year = data.year ? '' + data.year : null;
    this.month = data.year ? zeroPadded(data.month) : null;
    this.day = data.year ? zeroPadded(data.day) : null;
    this.uncertain = !!data.uncertain;
    this.approximate = !!data.approximate;
    this.open = !!data.open;
    this.unknown = !!data.unknown;

    return this;
  }

  EDTFDate.prototype = {
    asEDTFString: function () {
      var s = '';

      if (this.open) return 'open';
      if (this.unknown) return 'unknown';

      s += this.year;
      if (this.month) s += '-' + this.month;
      if (this.day) s += '-' + this.day;
      if (this.uncertain) s += '?';
      if (this.approximate) s += '~';

      return s;
    },

    toString: function () {
      return this.asEDTFString();
    },

    toNativeDate: function () {
      var date = new Date(0);

      // js Date type can't represent these cases
      if (this.unknown || this.open) {
        return null;
      }
      if (this.year < -271820 || this.year > 275759) {
        return null;
      }
      if (this.year.indexOf('uu') >= 0) {
        return null;
      }

      date.setFullYear(this.year);

      switch (this.month) {

      // If month is not set or is 'uu', pretend it's January 1.
      case null:
      case 'uu':
        date.setMonth(0);
        date.setDate(1);
        break;

      // Assuming northern hemisphere for seasons.
      case 21:
        date.setMonth(2);
        date.setDate(22);
        break;
      case 22:
        date.setMonth(5);
        date.setDate(22);
        break;
      case 23:
        date.setMonth(8);
        date.setDate(22);
        break;
      case 24:
        date.setMonth(11);
        date.setDate(22);
        break;

      // Month is set; if day is not set or is 'uu', pretend it's the first.
      default:
        date.setMonth(parseInt(this.month, 10) - 1);
        if (this.day === null || this.day === 'uu') {
          date.setDate(1);
        } else {
          date.setDate(parseInt(this.day, 10));
        }
        break;
      }

      return date;
    }
  }

  function edtfObjFromString(string) {
    var tokens
      , edtfObj = {}

    if (string === 'unknown') {
      return new EDTFDate({unknown: true});
    }
    if (string === 'open') {
      return new EDTFDate({open: true});
    }

    tokens = string
      .replace(/(?!^)-/g, ' ')
      .replace(/[?~]/g, ' $1')
      .split(' ');

    if (tokens.indexOf('?') >= 0) {
      edtfObj.uncertain = !!tokens.splice(tokens.indexOf('?'), 1)[0];
    }
    if (tokens.indexOf('~') >= 0) {
      edtfObj.approximate = !!tokens.splice(tokens.indexOf('~'), 1)[0];
    }

    edtfObj.year = tokens.splice(0, 1)[0];
    edtfObj.month = tokens.splice(0, 1)[0];
    edtfObj.day = tokens.splice(0, 1)[0];

    return new EDTFDate(edtfObj);
  }

  function validateSingleDate(dateString) {
    var verdict
      , sepMarks = dateString.split(/([?~]*)$/)
      , dateParts = sepMarks[0].split(/(?!^)-/)
      , possiblyUnclearYear = /^-?[0-9]{0,2}(?:[0-9]{2}|[0-9]u|uu)$/
      , knownYear = /^-?(?:[0-9]{1,4}|y[0-9]{5,})$/
      , possiblyUnclear = /^(?:[0-9]{2}|uu)$/
      , year
      , month
      , day
      , time // TODO

    switch (dateParts.length) {
    case 1:
      // Valid if this is only a year (possibly unclear).
      year = dateParts[0];
      verdict = possiblyUnclearYear.test(year) || knownYear.test(year)
      break;

    case 2:
      // Valid if this is a year (definitely known) and a month (possibly unclear)
      year = dateParts[0];
      month = dateParts[1];
      verdict = knownYear.test(year) && possiblyUnclear.test(month);
      if (/[0-9]/.test(month)) {
        verdict = verdict
          && (month >= 1 && month <= 12 || month >= 21 && month <= 24)
      }
      break;

    case 3:
      // Valid is this is a year (definitely known) and one of the following:
      // 1. Known month & possibly unclear day
      // 2. Unclear month & unclear day
      year = dateParts[0];
      month = dateParts[1];
      day = dateParts[2].split('T')[0];

      verdict = knownYear.test(year) && (
        (/^[0-9]{2}$/.test(month) && possiblyUnclear.test(day))
        ||
        (/^uu$/.test(month) && /^uu$/.test(day))
      );

      if (/[0-9]/.test(month)) {
        verdict = (month >= 1 && month <= 12) && verdict;
      }
      if (/[0-9]/.test(day)) {
        verdict = (day >= 1 && day <= 31) && verdict;
        verdict = wasADate(year, month, day) && verdict;
      }
      break;

    default:
      verdict = false;
    }
    return !!verdict;
  }

  var validateEDTF = function (str) {
    var verdict
      , intervals = str.split('/')
    
    switch (intervals.length) {
    case 1:
      verdict = validateSingleDate(intervals[0]);
      break;

    case 2:
      verdict = intervals[0].length && intervals[1].length &&
        ((validateSingleDate(intervals[0]) || /^unknown$/.test(intervals[0]))
         &&
         (validateSingleDate(intervals[1]) || /^(?:open|unknown)$/.test(intervals[1])))
      break;

    default:
      verdict = false;
    }

    return !!verdict;
  }

  var parseDateString = function (string) {
    var tokens
      , tokensCopy
      , validDate = true
      , edtfObj = {}
      , year
      , month
      , day
      , approximate
      , uncertain

    if (validateSingleDate(string)) {
      return edtfObjFromString(string);
    }

    tokens = string
      .replace(/[^\w0-9 /\-~?]/ig, '')
      .replace(/[/\-]/g, ' ')
      .replace(/([?~])/g, ' $1')
      .split(' ');

    tokensCopy = tokens.slice(0);

    // This is pretty stupid, but works for our purposes. Splits up a string and
    // then fails if the date is not valid
    while (tokens.length > 0 && validDate) {
      
      // Fail without a year!
      if (!('year' in edtfObj)) {
        year = getYear(tokens);
        if (year && tokens.indexOf(year) >= 0) {
          edtfObj.year = year;
          tokens.splice(tokens.indexOf(edtfObj.year), 1);
        } else {
          validDate = false;
        }
        continue;
      }


      if (!('uncertain' in edtfObj)) {
        uncertain = matchInArray(tokens, tokenGroups.uncertain);
        if (uncertain && tokens.indexOf(uncertain.token) >= 0) {
          edtfObj.uncertain = true;
          tokens.splice(tokens.indexOf(uncertain.token), 1);
        } else {
          edtfObj.uncertain = false;
        }
        continue;
      }

      if (!('approximate' in edtfObj)) {
        approximate = matchInArray(tokens, tokenGroups.approximate);
        if (approximate && tokens.indexOf(approximate.token) >= 0) {
          edtfObj.approximate = true;
          tokens.splice(tokens.indexOf(approximate.token), 1);
        } else {
          edtfObj.approximate = false;
        }
        continue;
      }
      
      if (!('month' in edtfObj)) {
        month = getMonth(tokens, numericalTokens(tokensCopy).indexOf(edtfObj.year) === 2);
        if (month && tokens.indexOf(month.token) >= 0) {
          tokens.splice(tokens.indexOf(month.token), 1);
          edtfObj.month = month.month;
        } else {
          validDate = false;
        }
        continue;
      }

      if (edtfObj.month > 20) {
        validDate = false;
        continue;
      }

      if (!('day' in edtfObj)) {
        day = getDay(tokens);
        if (day && tokens.indexOf(day.token) >= 0) {
          tokens.splice(tokens.indexOf(day.token), 1);
          edtfObj.day = day.day;
        } else {
          validDate = false;
        }
        continue;
      }

      // Leftover stuff that we haven't understood
      validDate = false;

    }

    if (validDate && year && month && day) {
      validDate = wasADate(edtfObj.year, edtfObj.month, edtfObj.day);
    }

    return validDate ? new EDTFDate(edtfObj) : null;
  }

  exports.parseDateString = parse;
  exports.validateEDTF = validateEDTF;

})(typeof(exports) === 'undefined' ? this.edtf = {} : exports);
