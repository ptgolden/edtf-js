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
