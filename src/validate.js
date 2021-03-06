function uncertainOrApproximateParts(str) {
  var grouped
    , affected
    , results = []
    , affectedGroups 

  // Make a string where every ? or ~ marker applies to a group in parentheses
  grouped = str
    .replace(/(^|-)([0-9u\-]+)([?~])/g, '$1($2)$3')
    .replace(/~\?/g, '?~'); // Processing marks in ?, ~ order

  // Replace each part with T$index, to end up with, e.g.:
  // (T0-T1)?-T2 or (T0)?~-(T1-T2)~
  for (var i = 0; i < str.match(/[0-9u]+/g).length; i++) {
    grouped = grouped.replace(/(^|[^T])([0-9u]+)/, '$1T' + i);
    results[i] = {uncertain: false, approximate: false};
  }

  // This will give the indices of the sections affected by the leftmost
  // instance of the provided token.
  affectedGroups = function (token) {
    var tmpstr;
    tmpstr = grouped.slice(0, grouped.indexOf(')' + token) + 1);
    tmpstr = tmpstr.replace(/\((.*)\)/, '$1');
    return tmpstr.replace(/[^0-9]/g, '').split(/\B/);
  }

  // These two might be written better with recursion
  if (str.indexOf('?') >= 0) {
    for (var i = 0; i < str.match(/\?/g).length; i++) {
      affected = affectedGroups('?');
      for (var j = 0; j < affected.length; j++) {
        results[affected[j]].uncertain = true;
      }
      grouped = grouped.replace('?', '');
    }
  }

  if (str.indexOf('~') >= 0) {
    for (var i = 0; i < str.match(/~/g).length; i++) {
      affected = affectedGroups('~');
      for (var j = 0; j < affected.length; j++) {
        results[affected[j]].approximate = true;
      }
      grouped = grouped.replace('~', '');
    }
  }

  return results
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

exports.validateEDTF = validateEDTF;
