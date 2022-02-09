// ;; A lot of these comments are my own comments (denoted by // ;;). Ones that are missing are the original comments that were here once upon a time (or simply ones that I've missed).

var pi = Math.pi;
var t_length;	// Length axis
var y_height;	// Amplitude axis (max waveform value +1)
var squ_amp; // Amplitude of square wave

// Limit range from 0 to 1
function norm1(x) {
	return x - Math.floor(x);
}
// Basic function
// Uses sine
// 0 to 2 * pi corresponds to 0 to 1
// Range is a sine wave -1 to 1

// ;; Define the basic usable waveforms and their parameters
function sin(phase) {
	return Math.sin(2 * Math.PI * phase);
}
function saw(phase) {
	var n = norm1(phase);
	return n*2 - 1;
}
// The second argument is asymm (asymm = 0.5 if there are not 2 arguments)
// asymm 0.5 = Left and right symmetry
// >0.5 asymm = center is to the right
// <0.5 asymm = center is to the left
function squ(phase) {
	var n = norm1(phase);
	var asymm = 0.5;
	switch (arguments.length) {
	case 1:
		break;
	case 2:
		asymm = arguments[1];
		break;
	default:
		return 0;
		break;
	}
	return (n < asymm ? squ_amp : -squ_amp);
}

function tri(phase) {
	var n = norm1(phase);
	var asymm = 0.5;
	switch (arguments.length) {
	case 1:
		break;
	case 2:
		asymm = arguments[1];
		break;
	default:
		return 0;
		break;
	}
	var slope_p = 2.0 / asymm;
	var slope_m = 2.0 / (1 - asymm);
	return n < asymm ? -1 + slope_p * n : 1 - slope_m * (n - asymm);
}

// sprintf("\$%02x", $num)
function toHexStr(num, prefix_str, signed_check, usePrefix=true) {
	var prefix;

	if (signed_check) {
		prefix = prefix_str;
		if (num >= 128) {
			num = num - 128; //128, 129, 130, -> 0, 1, 2, 3,
		} else {
			num = num + 128; //127, 126, 125, -> 255, 254, 253
		}
	} else {
		if (num >= 0) {
			prefix = prefix_str;
		} else {
			prefix = "-" + prefix_str;
			num = -num;
		}
	}
	if (num < 16 && usePrefix == true) {
		prefix += "0";
	}
	return prefix + num.toString(16).toUpperCase();
}

// ;; The main calculate function, calculate how the waveform should be drawn with floating point numbers
// ;; Also read the radio button settings and stay within their bounds
function calcmain() {
	t_length = parseInt(window.document.F1.N.value);
	y_height = parseInt(window.document.F1.M.value) + 1;
    squ_amp = ((y_height - 1) / y_height);
    /* y_height = the height defined in the waveform amplitude value
     * dividing this by itself, with the dividend having one less than the divisor gives us a good approximation of the waveform in floating point.
     * However, doing this will result in a slight error rate. It gets less severe if the waveform is larger (8bit waveforms will have less error than 4bit ones)
     * To account for this, all we need to do is multiply this value by the error rate, which we get from "1 / ((y_height-1) / y_height)".
     * e.g., y_height = 16; 15/16 = 0.9375; 1 / 0.9375 = 1.06666...; 0.9375 * 1.06666... = 1;

     * Later correction: this should only be relevant if the output is float. Otherwise, the maximum value is too high.
     * Later correction 2: This is implemented in a way too hacky way, so I chose to revert this.
    */

	var fdata = new Array(t_length);
	var idata = new Array(t_length);
	var t;
	var datafunction = new Function("p", "return " + window.document.F1.FUNC.value + ";");

	var signed_check;
	if (window.document.F1.sign[0].checked) {
		signed_check = false;
	} else {
		signed_check = true;
	}
    // ;; This function converts from floating point to integers; y_height/2 is added to center the waveform to whatever the midmost point of y_height is (if it's 0-15, that'd be 8)
    function normalize(x) {
    	return Math.floor(x*(y_height/2) + y_height/2);
    }
	// ;; This function makes the wrap distortion work properly by adjusting the offset of the waveform when it crosses over the boundries.
	function stairDouble(x) {
		return Math.ceil((Math.abs(x)-1)/2)*2;
	}

	// ;; This function ENSURES fold works properly. Jesus christ this was actual hell to fix and it turns out it just needs to be behind by 1 to work properly. Christ.
	function invertWave(x) {
		if (((stairDouble(x)-1) & 2) == 2) {
			return true;
		}
		else {
			return false;
		}
	}

    // ;; This is where the results are appended to strings and the graph is generated.
	var result_vals = new Array(t_length);
    var i;
    var c;

    // ;; Check which distortion option is selected
    var distMethod = 0;
    for (i = 0; i < window.document.F1.clamp.length; i++)
    {
        if (window.document.F1.clamp[i].checked)
        {
            c = i;
            break;
        }
    }
    //;; This block of switch statements will put the integers in idata[i] and fdata[i], depending on which distortion mode is selected.
    /* None - output as is.
     * Clip - replace values beyond the maximum/minimum allowed range with their maximum/minimum counterparts.
     * Fold - invert values beyond the maximum/minimum range so that they still stay in range.
     * Wrap - values beyond the maximum/minimum range will be wrapped to the opposite side creating gnarly effects.
	 * All results go through an absolute verificiation - if the "absolute" checkbox is ticked, ensure all values are positive (and the waveform is properly amplified to make up for this)

	 Honestly, this code is kind of a mess. There's probably good ways to clean this up, but I don't really know of them (yet).
     */
    switch (c) {
		case 0: // ;;none
		default:
            for (t = 0 ; t < t_length; t++) {
        		var p = (t + 0.5) / t_length;
        		var y;
        		y = datafunction(p);
				if (window.document.F1.abscheck.checked) {
					fdata[t] = (Math.abs(y))*2-1;
					idata[t] = normalize((Math.abs(y))*2-1);
				}
				else {
					fdata[t] = y;
	                idata[t] = normalize(y);
				}
        	}
        break;
        case 1: // ;;clip
            for (t = 0 ; t < t_length; t++) {
        		var p = (t + 0.5) / t_length;
        		var y;
                if (datafunction(p) > squ_amp) {
                    y = squ_amp;
                }
                else if (datafunction(p) < -squ_amp) {
                    y = -squ_amp;
                }
                else {
        		y = datafunction(p);
                }
				if (window.document.F1.abscheck.checked) {
					fdata[t] = (Math.abs(y))*2-1;
					idata[t] = normalize((Math.abs(y))*2-1);
				}
				else {
					fdata[t] = y;
	                idata[t] = normalize(y);
				}
        	}
        break;
        case 2: // ;;fold
            for (t = 0 ; t < t_length; t++) {
                var p = (t + 0.5) / t_length;
                var y;
				if (datafunction(p) > 1) {
					if (invertWave(datafunction(p))) {
						y = datafunction(p) - stairDouble(datafunction(p));
					} else {
						y = -datafunction(p) + stairDouble(datafunction(p));
					}
                }
                else if (datafunction(p) < -1) {
					if (invertWave(datafunction(p))) {
						y = datafunction(p) + stairDouble(datafunction(p));
					} else {
						y = -datafunction(p) - stairDouble(datafunction(p));
					}
                }
                else {
        		y = datafunction(p);
                }
				if (window.document.F1.abscheck.checked) {
					fdata[t] = (Math.abs(y))*2-1;
					idata[t] = normalize((Math.abs(y))*2-1);
				}
				else {
					fdata[t] = y;
	                idata[t] = normalize(y);
				}
            }
        break;
        case 3: // ;;wrap
            for (t = 0 ; t < t_length; t++) {
        		var p = (t + 0.5) / t_length;
        		var y;
                if (datafunction(p) > 1) {
                    y = datafunction(p) - stairDouble(datafunction(p));
                }
                else if (datafunction(p) < -1) {
                    y = datafunction(p) + stairDouble(datafunction(p));
                }
                else {
        		y = datafunction(p);
                }
				if (window.document.F1.abscheck.checked) {
					fdata[t] = (Math.abs(y))*2-1;
					idata[t] = normalize((Math.abs(y))*2-1);
				}
				else {
					fdata[t] = y;
	                idata[t] = normalize(y);
				}
        	}
        break;
    }
	for (t = 0 ; t < t_length; t++) {

	}

    // ;; Time to see which output format was selected (and then output in said format)
    var i;
    var c;
    for (i = 0; i < window.document.F1.format.length; i++)
    {
        if (window.document.F1.format[i].checked)
        {
            c = i;
            break;
        }
    }
	switch (c) {
		case 0: //decimal
        	for (i = 0; i < t_length; i++) {
        		result_vals[i] = idata[i];
        	}
		break;
		case 1: //"$XXh"
			for (i = 0; i < t_length; i++) {
				result_vals[i] = toHexStr(idata[i], "$", signed_check);
			}
		break;
		case 2: //"0xXXh"
			for (i = 0; i < t_length; i++) {
				result_vals[i] = toHexStr(idata[i], "0x", signed_check);
			}
		break;
		case 3: //"XXh"
		for (i = 0; i < t_length; i++) {
			result_vals[i] = toHexStr(idata[i], "", signed_check);
		}
		break;
		case 4: //"Xh"
		for (i = 0; i < t_length; i++) {
			result_vals[i] = toHexStr(idata[i], "", signed_check, false);
		}
		break;
		case 5: // normalized float
			for (i = 0; i < t_length; i++) {
				result_vals[i] = fdata[i];
			}
		break;
	}

    //;;Select the separator to use for the output string
	var i;
	var c;
	for (i = 0; i < window.document.F1.separator.length; i++) {
		if (window.document.F1.separator[i].checked) {
			c = i;
			break;
		}
	}
	var sep;
	switch (c) {
		case 0: //none ""
			sep = "";
			break;
		case 1: //space " "
			sep = " ";
			break;
		case 2: //comma and space ", "
			sep = ", ";
			break;
		case 3: //comma ","
			sep = ",";
			break;
		case 4: //new line
			sep = "\n";
			break;
	}
	window.document.F1.TEXT.value = result_vals.join(sep);

	/*******************
	*
	*  WAVEFORM GRAPH
	*
	*******************/

	var horizontalError = ((t_length - 1) / t_length); //;; Determine the error amount when using low sample sizes, this is similar to squ_amp issues I have been having above.
	var canvas = document.getElementById("graphcanvas");
	var draw = canvas.getContext("2d");
	var smpWidth = 0.999*((canvas.width / t_length) / horizontalError);
	var smpHeight = 0.99*((canvas.height / y_height) / squ_amp);

	//;; Prepare the canvas when GENERATE is pressed.
	draw.clearRect(0, 0, canvas.width, canvas.height); //;; Clear the canvas
	draw.moveTo(0,(canvas.height)/2); //;; Move to the middle-leftmost point on the canvas.
	draw.beginPath(); //;; Graph initialization begins here
	draw.strokeStyle = '#0f0';
	draw.lineWidth = 2;
	for (i = 0; i < t_length; i++) {
		//;; Two functions are used here so that the resulting waveform is stepped (not interpolated).
		draw.lineTo((smpWidth*i),(smpHeight*idata[i]));
		draw.lineTo((smpWidth*i),(smpHeight*idata[i+1]));
	}
	draw.stroke();
}

//;; Function to set wavetable parameters based on the preset format selected.
function nmpreset(n, m, s) {
	window.document.F1.N.value = n;
	window.document.F1.M.value = m;
	window.document.F1.sign[0].checked = 1-s;
	window.document.F1.sign[1].checked = s;
}
function uncheckradio() {
	var i;
	for (i = 0; i < window.document.F1.preset.length; i++) {
		window.document.F1.preset[i].checked = false;
	}
}
//;; This will select the output when any part of it is selected.
function selectText() {
  const input = document.getElementById('waveout');
  input.focus();
  input.select();
  input.setSelectionRange(0, 99999); /* For mobile devices */
  navigator.clipboard.writeText(input.value);
  var tooltipCopied = document.getElementById("clipboard-tooltip");
  tooltipCopied.innerHTML = "Copied waveform!";
}

//;; This will show a tooltip saying "Click to copy"
function tooltip() {
  var tooltip = document.getElementById("clipboard-tooltip");
  var tooltipbody = document.getElementById("tooltipBody");
  var waveformOutput = document.getElementById("waveout");
  tooltip.innerHTML = "Copy to clipboard";
}

////////////////////////////////////////////////////////////////////////////////
//// HELP MENU TIME ////////////////////////////////////////////////////////////

function showHelp() {
	var helpVisibility = document.getElementById("help");
	helpVisibility.style.display = "block";
	document.getElementById("help").scrollIntoView({behavior: 'smooth'});
}
