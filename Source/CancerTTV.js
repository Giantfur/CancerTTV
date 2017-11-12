// Constants
var regExSpaces = / +/g;
var antiGlobalTimeLimit = 31;
var antiGlobalMessageLimit = 20;
var antiGlobalDisplaySizeMin = 12;
var antiGlobalDisplaySizeMax = 72;
var repeatSpamArr = [',', '.', '-', '"', '_', ':', ';'];
var sendingTooFastCooldown = 1000;

// Variables
var currentChatMessage = '';
var antiGlobalTimekeeper = [];
var repeatSpamIndex = 0;
var chatBoxHasProgramChange = false;
var lastMessage = '';
var chatBoxRepeatSpamEndLength = 0;
var ctrlIsHeld = false;
var cleanupFunctionsOneTime = [];
var cleanupFunctions = [];

// Page anchors
var $chatSend, $chatMessageArea, $chatArea, $chatBox;

// CTTV Elements
var $helpPopup, $globalLimitDisplay, $menuAreaTop, $storedPastaTop;

// Storage helpers
function getBoolFromStorage (varName, defaultCase) {
    var val = window.localStorage.getItem(varName);
    if (val === null)
        return defaultCase;
    return (val === 'true');
}
// Storage/Configuration
var cttvSelectedEmote =
    window.localStorage.getItem('cttvSelectedEmote') || 'Kappa';
var showSendingTooFastIndicator =
    getBoolFromStorage('cttvShowSendTooFast', true);
var showGlobalMessageLimitCounter =
    getBoolFromStorage('cttvShowGlobalMessageLimit', true);
var showHelpPopupQuestionMark =
    getBoolFromStorage('cttvShowQuestionMark', true);
var showAutoSend =
    getBoolFromStorage('cttvShowAutoSend', true);
var firstTime =
    getBoolFromStorage('cttvFirstTime', true);
var enableStoredPastaKeys =
    getBoolFromStorage('cttvEnableStoredPastaKeys', true);

var storedPasta = [];
for (var i = 0; i < 10; i++) {
    storedPasta.push(window.localStorage.getItem('cttvStoredPasta' + i));
}

// Set manually for debugging
var devDebug = getBoolFromStorage('cttvDevDebug', false);

// Options menu

function helpPopupDiv (addString) {
    return '<div class="help-popup-message-cttv" ' + addString + '>';
}

function helpPopupLabel(addString) {
    return '<label class="help-popup-message-cttv" ' + addString + '>';
}

var optionsMenuContents = [
    $(
        helpPopupLabel() +
        '<input  type="checkbox" ' + (enableStoredPastaKeys ? 'checked' : '') +
        '/> Enable stored pasta hotkeys</label>'
    )
        .on('change', function (e) {
            setEnableStoredPastaKeys(e.target.checked);
        })
    ,

    $(
        helpPopupLabel(
            'title="It doesn&#39;t have to be just an emote.&#10;' +
            'Any characters are allowed, including spaces."'
        ) +
        'Stored emote<br><input type="textarea" value="' + cttvSelectedEmote +
        '" style="width: 90%;"/></label>'
    )
        .on('keyup', function (e) {
            setSelectedEmote(e.target.value);
        })
    ,

    $(
        helpPopupLabel() +
        '<input  type="checkbox" ' + (showAutoSend ? 'checked' : '') +
        '/> Show auto send checkbox</label></div>'
    )
        .on('change', function (e) {
            setShowAutoSend(e.target.checked);
            if (showAutoSend)
                createAutoSend();
            else
                removeAutoSend();
        })
    ,

    $(
        helpPopupLabel() +
        '<input  type="checkbox" ' +
        (showSendingTooFastIndicator ? 'checked' : '') +
        '/> Show sending messages too fast</label>'
    )
        .on('change', function (e) {
            setShowSendingTooFast(e.target.checked);
            if (showSendingTooFastIndicator)
                createSendingTooFastIndicator();
            else
                removeSendingTooFastIndicator();
        })
    ,

    $(
        helpPopupLabel() +
        '<input  type="checkbox" ' +
        (showGlobalMessageLimitCounter ? 'checked' : '') +
        '/> Show global message limit</label>'
    )
        .on('change', function (e) {
            setShowGlobalLimitDisplay(e.target.checked);
            if (showGlobalMessageLimitCounter)
                createGlobalLimitDisplay();
            else
                removeGlobalLimitDisplay();
        })
    ,

    $(
        helpPopupLabel() +
        '<input  type="checkbox" ' +
        (showHelpPopupQuestionMark ? 'checked' : '') +
        ' /> Show question mark</label>'
    )
        .on('change', function (e) {
            setShowHelpPopup(e.target.checked);
            if (!showHelpPopupQuestionMark) {
                removeHelpPopup();
            }
            else {
                createHelpPopup();
                $helpPopup.css('display', 'none');
            }
        })
];

function setSelectedEmote (newEmote) {
    cttvSelectedEmote = newEmote;
    window.localStorage.setItem('cttvSelectedEmote', cttvSelectedEmote);
}

function setEnableStoredPastaKeys (newValue) {
    enableStoredPastaKeys = newValue;
    window.localStorage.setItem(
        'cttvEnableStoredPastaKeys',
        newValue.toString());
}

// Auto Send

function setShowAutoSend (newValue) {
    showAutoSend = newValue;
    window.localStorage.setItem('cttvShowAutoSend', newValue.toString());
}

var $autoSendToggle;
function createAutoSend () {
    if (!$autoSendToggle) {
        $autoSendToggle = $(
            '<label><input type=checkbox title="Auto send messages"' +
            'style="position: relative;' +
            'margin: 0px 0px 0px 6px; top: 3px;"/>Autosend</label>')
            .appendTo($chatSend.parent().children('.flex.flex-row'));
    }
}
function removeAutoSend () {
    if (!$autoSendToggle)
        return;

    $autoSendToggle.remove();
    $autoSendToggle = false;
}

cleanupFunctions.push(function () {
    removeAutoSend();
});

// Global limit

var globalLimitDisplayInterval;
function createGlobalLimitDisplay () {
    if ($globalLimitDisplay)
        return;

    $globalLimitDisplay = $('<p class="global-limit-display">Test</p>')
        .appendTo($chatBox.parent());

    var lastLen = -1;
    function antiGlobalMessageLoop () {
        var diff = new Date().getTime() - antiGlobalTimekeeper[0];
        if (diff > antiGlobalTimeLimit * 1000) {
            antiGlobalTimekeeper.shift();

        }
        var gtlen = antiGlobalTimekeeper.length;
        if (gtlen === lastLen)
            return;
        lastLen = gtlen;

        var textScaler = scaleNumberRange(
            Math.min(gtlen, 17), 0, 17,
            antiGlobalDisplaySizeMin, antiGlobalDisplaySizeMax);
        var colorScaler = scaleNumberRange(
            Math.min(gtlen, 17), 0, 17,
            126, 255);
        var gbInverseScaler = scaleNumberRangeInverse(
            Math.min(gtlen, 17), 0, 17,
            0, 126);
        $globalLimitDisplay.css('font-size', (textScaler) + 'px')
            .css('color', rgb(colorScaler, gbInverseScaler, gbInverseScaler));
        $globalLimitDisplay.css('opacity', (gtlen < 3 ? 0 : 1));
        $globalLimitDisplay.text(gtlen === antiGlobalMessageLimit ? 'MAX' : gtlen);

    }

    globalLimitDisplayInterval = setInterval(antiGlobalMessageLoop, 100);
}

function removeGlobalLimitDisplay () {
    if (!$globalLimitDisplay)
        return;

    clearInterval(globalLimitDisplayInterval);
    $globalLimitDisplay.remove();
    $globalLimitDisplay = false;
}

function setShowGlobalLimitDisplay (newValue) {
    showGlobalMessageLimitCounter = newValue;
    window.localStorage.setItem(
        'cttvShowGlobalMessageLimit',
        newValue.toString());
}

cleanupFunctions.push(function () {
    removeGlobalLimitDisplay();
});

// Sending too fast

var $sendingTooFastIndicator;
var sendingTooFastInterval;
function createSendingTooFastIndicator () {
    if ($sendingTooFastIndicator)
        return;

    $sendingTooFastIndicator = $(
        '<p class="sending-too-fast-indicator">X</p>')
        .appendTo($chatBox.parent());

    var lastState = -1;
    function sendTooFastIsLastState (currentState) {
        if (currentState === lastState) {
            return true;
        }
        else {
            lastState = currentState;
            return false;
        }
    }

    function sendingTooFastLoop () {

        var diff = new Date().getTime() -
            antiGlobalTimekeeper[antiGlobalTimekeeper.length - 1];
        if (diff > sendingTooFastCooldown || isNaN(diff)) {
            if (diff > sendingTooFastCooldown + 1000 || isNaN(diff)) {
                if (sendTooFastIsLastState(3))
                    return;

                $sendingTooFastIndicator.css('opacity', '0');
            }
            else {
                if (sendTooFastIsLastState(2))
                    return;

                $sendingTooFastIndicator.text('O');
                $sendingTooFastIndicator
                    .css('color', 'green')
                    .css('opacity', '1');
            }
        }
        else {
            if (sendTooFastIsLastState(1))
                return;

            $sendingTooFastIndicator.text('X');
            $sendingTooFastIndicator.css('color', 'red').css('opacity', '1');
        }
    }
    sendingTooFastInterval = setInterval(sendingTooFastLoop, 100);
}

function removeSendingTooFastIndicator () {
    if (!$sendingTooFastIndicator)
        return;

    clearInterval(sendingTooFastInterval);
    $sendingTooFastIndicator.remove();
    $sendingTooFastIndicator = false;
}

function setShowSendingTooFast (newValue) {
    showSendingTooFastIndicator = newValue;
    window.localStorage.setItem('cttvShowSendTooFast', newValue.toString());
}

cleanupFunctions.push(function () {
    removeSendingTooFastIndicator();
});

// Help Popup

function createHelpPopup () {
    if ($helpPopup)
        return false;

    $helpPopup = $(
        '<div class=help-popup-cttv><font size=4 color=black>' +
        '<b>?</b></font></div>')
        .appendTo($chatArea);

    $helpPopup.on('click', function (e) {
        e.stopPropagation();
        toggleCttvMenu();
    });
}

function removeHelpPopup () {
    $helpPopup.remove();
    $helpPopup = false;
}

function setShowHelpPopup (newValue) {
    showHelpPopupQuestionMark = newValue;
    window.localStorage.setItem('cttvShowQuestionMark', newValue.toString());
}

cleanupFunctions.push(function () {
    removeHelpPopup();
});

// Stored Pasta Menu

function toggleStoredPasta() {
    if (!storedPastaShown) {
        storedPastaShown = true;
        $menuAreaTop.find('#stored-pasta-button').text('►►');
        $storedPastaTop = $(
            '<div class="help-popup-top-cttv stored-pasta-top">');

        var storedPastaArea = $(
            '<div data-simplebar style="height: 100%;">')
            .appendTo($storedPastaTop);

        var closeStoredPasta = $(
            '<span class="close-help-area-button">X</span>')
            .appendTo($storedPastaTop);

        closeStoredPasta.on('click', function () {
            cleanupStoredPasta();
        });
        function makeOnKeyupPasta(i) {
            return function () {
                setStoredPasta(i, this.value);
            };
        }
        for (var i = 0; i < storedPasta.length; i++) {
            var d = $(helpPopupDiv() +
                getKbd('Ctrl', (i === 9 ? 0 : i + 1)) + '</div>')
                .appendTo(storedPastaArea);
            $('<textarea rows=5 maxlength=500 />')
                .appendTo(d)
                .val(storedPasta[i])
                .on('keyup', makeOnKeyupPasta(i));
        }

        $storedPastaTop.appendTo('.right-column');

        setTimeout(function () {
            $storedPastaTop.addClass('move-left');
        }, 10);
    }
    else {
        cleanupStoredPasta();
    }
}

function cleanupStoredPasta() {
    if (!$storedPastaTop)
        return;

    storedPastaShown = false;
    debug('CTTV spt: ' + $storedPastaTop[0].style.right);
    if ($storedPastaTop[0].style.right !== '100%') {
        $storedPastaTop.removeClass('move-left');
        $menuAreaTop.find('#stored-pasta-button').text('◄◄');
        var storedPastaTopTemp = $storedPastaTop;
        storedPastaTopTemp.one('transitionend', function () {
            storedPastaTopTemp.remove();
        });
        $storedPastaTop = false;
    }
    else {
        $storedPastaTop.remove();
    }
}

function setStoredPasta (num, val) {
    storedPasta[num] = val;
    window.localStorage.setItem('cttvStoredPasta' + num, val);
}

cleanupFunctions.push(function () {
    cleanupStoredPasta();
});

// Menu

var lastHelpPopupScrollPosition = 2;
var cttvMenuShown = false;
var storedPastaShown = false;
var menuSimpleBar;

var kappaImage = '<img class="emoticon" ' +
    'src="https://static-cdn.jtvnw.net/emoticons/v1/25/1.0" />';
function getKbd() {
    var returnStr = '<span class="kbd">' + arguments[0] + '</span>';
    for (var i = 1; i < arguments.length; i++)
        returnStr += ' + <span class="kbd">' + arguments[i] + '</span>';
    return returnStr;
}

function toggleCttvMenu () {
    if (cttvMenuShown) {
        removeCttvMenu();
        return;
    }

    cttvMenuShown = true;

    // If stored pasta menu is open, move it out of the way
    if ($storedPastaTop) {
        $storedPastaTop.css('right', 'calc(100% + 250px)');
    }

    // Hide the help popup
    if ($helpPopup) $helpPopup.css('display', 'none');

    $menuAreaTop = $('<div class="help-popup-top-cttv">');

    var $menuArea = $('<div style="height: 100%;">')
        .appendTo($menuAreaTop);

    var $optionsDropdown = $(
        '<div class="help-popup-message-cttv help-popup-button-cttv" ' +
        'title="Click this to open the options menu.">' +
        '<span class="VVVVVV" style="float: left;">▼▼</span>' +
        '<span style="text-align: center;">OPTIONS</span>' +
        '<span class="VVVVVV" style="float: right;">▼▼</span></div>')
        .appendTo($menuArea);


    var optionsDropdownShown = false;
    var optionsDropdownChildren = [];
    $optionsDropdown.on('click', function () {
        if (!optionsDropdownShown) {
            $optionsDropdown.find('.VVVVVV').text('▲▲');

            optionsDropdownChildren = [];

            // These are created in reverse order.
            // ¯\_(ツ)_/¯

            for (var i = 0; i < optionsMenuContents.length; i++) {
                optionsMenuContents[i].insertAfter($optionsDropdown);
                optionsDropdownChildren.push(optionsMenuContents[i]);
            }

            optionsDropdownShown = true;
        }
        else {
            $optionsDropdown.find('.VVVVVV').text('▼▼');
            optionsDropdownChildren.forEach(function (el) { el.remove(); });
            optionsDropdownShown = false;
        }
    });

    var openStoredPastaButton = $(
        '<label class="help-popup-message-cttv help-popup-button-cttv" ' +
        'title="Click this to view and change your stored pasta.">' +
        '<span class="VVVVVV" style="float: left;" id="stored-pasta-button">' +
        (storedPastaShown ? '►►' : '◄◄') +
        '</span><span style="text-align: center;">' +
        'STORED PASTA</span></label>')
        .appendTo($menuArea);

    openStoredPastaButton.on('click', function () {
        toggleStoredPasta();
    });

    var hints = [];

    hints.push($(helpPopupDiv(
        'title="Or middle click to copy their name too!"') +
        getKbd('Ctrl') + '<br>Hold down and left click any message to copy ' +
        'it to your chatbox!</div>')
        .appendTo($menuArea));

    hints.push($(helpPopupDiv(
        'title="Attaches a random squiggly at the end to bypass twitch spam ' +
        'filters."') + getKbd('Ctrl', 'O') +
        '<br>Sends your previous message again!</div>')
        .appendTo($menuArea));

    hints.push($(helpPopupDiv(
        'title="Current chatbox message. If it&#39;s empty, ' +
        'last message sent.&#10;"') +
        getKbd('Ctrl', 'Shift', '1-9') +
        '<br>Store the chatbox text.</div>')
        .appendTo($menuArea));

    hints.push($(helpPopupDiv(
        'title="Inserts the stored emote between all spaces in the current chat box text.&#10;' +
        'Uses your stored emote defined in options."') + 'Test Message Test<br>' + getKbd('Ctrl', 'K') +
        '<br>' + kappaImage + ' Test ' + kappaImage + ' Message ' + kappaImage + ' Test ' + kappaImage + '</div>')
        .appendTo($menuArea));

    hints.push($(helpPopupDiv(
        'title="Inserts the stored emote at the beginning and end of the current chat box text.&#10;' +
        'Uses your stored emote defined in options."') + 'Test Message Test<br>' + getKbd('Ctrl', 'I') + '<br>' +
        kappaImage + ' Test Message Test ' + kappaImage + '</div>')
        .appendTo($menuArea));

    hints.push($(helpPopupDiv(
        'title="Repeats the current chat box message in a nice, convenient way."') + kappaImage +
        ' Test Message Test ' + kappaImage + '<br>' + getKbd('Ctrl', 'L') + '<br>' +
        kappaImage + ' Test Message Test ' + kappaImage + ' Test Message Test ' + kappaImage + '</div>')
        .appendTo($menuArea));

    hints.push($(helpPopupDiv('title="Inserts the first word of the chat box betwen all spaces."') + kappaImage + ' ' +
        'Test Message Test<br>' + getKbd('Ctrl', 'J') + '<br>' +
        kappaImage + ' Test ' + kappaImage + ' Message ' + kappaImage + ' Test ' + kappaImage + '</div>').appendTo($menuArea));

    hints.push($(helpPopupDiv('title="Inserts the first word of the chat box at the end."') + kappaImage + ' Test Message Test<br>' +
        getKbd('Ctrl', 'U') + '<br>' + kappaImage + ' Test Message Test ' + kappaImage + '</div>').appendTo($menuArea));

    hints.push($(helpPopupDiv('title="Inserts a space between every character in the chat box."') + 'TESTMESSAGE<br>' +
        getKbd('Ctrl', 'SPACE') + '<br>T E S T M E S S A G E</div>').appendTo($menuArea));

    hints.forEach(function (el) {
        el.on('click', function () {
            removeCttvMenu();
        });
    });

    var closeHelpArea = $(
        '<span class="close-help-area-button">X</span>')
        .appendTo($menuAreaTop);
    closeHelpArea.on('click', function () {
        removeCttvMenu();
    });

    $menuAreaTop.appendTo('.right-column');
    menuSimpleBar = new SimpleBar($menuArea.get(0));
    menuSimpleBar.getScrollElement().scrollTop = lastHelpPopupScrollPosition;
}

function removeCttvMenu() {
    if (!$menuAreaTop)
        return;

    lastHelpPopupScrollPosition = menuSimpleBar.getScrollElement().scrollTop;
    if ($helpPopup) $helpPopup.css('display', 'inline');
    cttvMenuShown = false;
    if ($storedPastaTop) {
        $storedPastaTop.css('z-index', '4');
        $storedPastaTop.css('right', '100%');
    }
    $menuAreaTop.remove();
    $menuAreaTop = false;
}

cleanupFunctions.push(function () {
    removeCttvMenu();
});

function main () {

    debug('CTTV Main called');
    debug($);
    debug($('.chat-list__lines'));

    $chatMessageArea = $('.chat-list__lines');
    $chatArea = $('.chat__container');
    $chatBox = $chatArea.find('div textarea');
    $chatSend = $('.chat-buttons-container [data-a-target="chat-send-button"]');

    if (showHelpPopupQuestionMark) {
        createHelpPopup();
    }

    if (showGlobalMessageLimitCounter)
        createGlobalLimitDisplay();

    if (showSendingTooFastIndicator)
        createSendingTooFastIndicator();

    if (showAutoSend)
        createAutoSend();

    var cttvShowMenuInterval = setInterval(function () {
        var chatSettings = $('.chat-settings');
        if (chatSettings.length > 0) {
            $(
                '<div><div class="border-t  mg-t-2 pd-y-2">' +
                '<p class="c-text-alt-2 upcase">CTTV Menu</p></div>' +
                '<div class="mg-b-1">Open CTTV Menu</div>' +
                '</div>')
                .on('click', function () {
                    toggleCttvMenu();
                })
                .appendTo(chatSettings);
            debug('Menu appended');
            clearInterval(cttvShowMenuInterval);
        }
    }, 300);
    cleanupFunctionsOneTime.push(function () {
        clearInterval(cttvShowMenuInterval);
    });

    function doAutoSend () {
        if ($autoSendToggle) {
            if ($autoSendToggle.children()[0].checked) {
                debug('CTTV autosend: ' + $chatBox[0].value);
                $chatSend.trigger('click');
            }
        }
    }

    function onChatBoxChange () {
        if ($chatBox.val().length > 500) {
            $chatBox.val($chatBox.val().slice(0, 500));
        }
        if ($chatBox.val() !== '' && !chatBoxHasProgramChange) {
            currentChatMessage = $chatBox.val();
            chatBoxRepeatSpamEndLength = 0;
        }
        chatBoxHasProgramChange = false;
        var inputEvent = new CustomEvent('input', { bubbles: true, detail: 'cttv' });
        $chatBox[0].dispatchEvent(inputEvent);
    }

    $chatBox.on('input', function (e) {
        if (e.detail === 'cttv') return;
        onChatBoxChange();
    });

    // I have to hack together this on message solution for BTTV support,
    // as it intercepts the chat box entirely
    function onSendMessage () {
        var splitStr = currentChatMessage.split(' ');
        var command = splitStr[0];
        var foundCommand = true;
        switch (command) {
            case '/cttvemote':
                var joinedStr = splitStr;
                joinedStr.splice(0, 1);
                joinedStr = joinedStr.join(' ');
                setSelectedEmote(joinedStr);
                break;
            default:
                foundCommand = false;
                break;
        }
        if (!foundCommand) {
            if (currentChatMessage !== '') {
                lastMessage = currentChatMessage;
                var tempTime = new Date().getTime();
                antiGlobalTimekeeper.push(tempTime);
            }
        }
        debug('CTTV send');
    }

    function onChatBoxKeyDown (e) {
        var keyCode = e.which || e.keyCode;
        switch (keyCode) {
            case keycodes.TAB:
            case keycodes.UP_ARROW:
            case keycodes.DOWN_ARROW:
                onChatBoxChange();
                break;

            case keycodes.ENTER:
                if (!$chatBox.is(':focus') && e.ctrlKey) {
                    $chatSend.trigger('click');
                }
                break;

            case keycodes.CTRL:
                if (!ctrlIsHeld) {
                    ctrlIsHeld = true;
                    addChatOnClick();
                    showHelpPopup(true);
                }
                break;
        }
    }

    // We brute-force rebind this function until we have a stable event handler.
    function chatBoxOnKeyDown (e) {
        var keyCode = e.keycode || e.which;
        if (keyCode === keycodes.ENTER)
            onSendMessage();
    }
    $chatBox.on('keydown', chatBoxOnKeyDown);

    // Instead of hooking the button, which BTTV eats, we hook the chat area. \o/
    $chatArea.on('click', function (e) {
        if ($(e.target).data('a-target') === 'chat-send-button' ||
            $(e.target).parent().data('a-target') === 'chat-send-button')
        {
            debug('CTTV click: ' + $chatBox.val());
            onSendMessage();
        }
    });

    function parseChat($element) {
        var messagetext = '';
        $.each($element.children(), function (i, val) {
            var $val = $(val);
            if ($val.data('a-target') === 'emote-name') {
                messagetext += $val.find('img').attr('alt'); return;
            } else if ($val.data('a-target') === 'chat-message-text' ||
                $val.data('a-target') === 'chat-message-mention') {
                if ($val.find('.bttv, .bttv-channel').length !== 0) {
                    var $nodes = $val.children().contents();
                    $.each($nodes, function (j, bttvnode) {
                        if (bttvnode.nodeType === 3) {
                            messagetext += $(bttvnode).text().replace(/\n */g, '');
                            return;
                        }

                        messagetext += $(bttvnode).find('img').attr('alt');
                        messagetext += ' ';
                    });
                } else {
                    messagetext += $val.text();
                }
                return;
            }
        });
        debug(messagetext);
        return messagetext;
    }

    var chatOnClickCssTag;
    var onClickCss = $(
        '<style scoped type="text/css">.chat-line { cursor: pointer !important; } \n' +
        '.chat-line__message:hover { background-color: rgb(126, 126, 126) !important; } \n' +
        '.chat-line__message > * { pointer-events: none!important; }</style>'
    );

    function addChatOnClick () {
        debug('chat onclick called');
        $chatMessageArea.on('mousedown', function (e) {
            debug('chatclick triggered');
            debug(e.target);
            var button = e.which;
            var $target = $(e.target);
            if (!$target.hasClass('chat-line__message')) $target = $target.parents('.chat-line__message');
            e.preventDefault();
            chatMessageOnClick($target, e, button);
        });
        chatOnClickCssTag = onClickCss.appendTo($chatMessageArea);
    }

    function chatMessageOnClick ($this, e, button) {
        if (button === 1 || button === 2) {
            var newMessage;
            newMessage = parseChat($this);
            if (button === 2) {
                newMessage = newMessage.insertAt(0, $this.find('.chat-author__display-name').text() + ': ');
            }
            var isSlashMeme = $this.attr('style');
            if (isSlashMeme !== undefined) {
                newMessage = newMessage.insertAt(0, '/me ');
            }
            $chatBox.val(newMessage).focus();
            onChatBoxChange();
            doAutoSend();
        }
    }


    function dockeydown(e) {
        var keyCode = e.keyCode || e.which;
        var switchFocus = false;

        if (e.ctrlKey && !e.altKey /*Alt gr is just alt+ctrl*/ && keyCode !== keycodes.CTRL) {
            switchFocus = true;
            var autoSend = false;
            var keyNumber = false;
            var tempChatText = $chatBox.val();
            var mMod = new MessageModification(tempChatText);
            if (chatBoxRepeatSpamEndLength !== 0) {
                mMod.text = mMod.text.slice(0, -chatBoxRepeatSpamEndLength);
                chatBoxRepeatSpamEndLength = 0;
            }
            mMod.checkSlashMeme();
            mMod.text = mMod.text.trim();
            var tempText, tempEmote, tempLast;
            switch (keyCode) {
                default:
                    // Do nothing
                    switchFocus = false;
                    break;

                case keycodes.KEY_O:
                    // Repeat last message with a cycling squiggly at the end to avoid the same message cooldown

                    // Set current chat message manually in case something was entered between spamming
                    currentChatMessage = lastMessage;

                    mMod.disableCleanup = true;
                    repeatSpamIndex++;
                    mMod.text = lastMessage;
                    if (antiGlobalTimekeeper.length !== 0) {
                        mMod.text += ' ' + repeatSpamArr[repeatSpamIndex % repeatSpamArr.length];
                        chatBoxRepeatSpamEndLength = 2;
                        chatBoxHasProgramChange = true;
                    }
                    autoSend = true;
                    break;

                case keycodes.KEY_K:
                    // Surround the message with the stored emote and replace all spaces with it
                    mMod.text = cttvSelectedEmote + ' ' + mMod.text.replace(regExSpaces, ' ' + cttvSelectedEmote + ' ') +
                        ' ' + cttvSelectedEmote;
                    break;

                case keycodes.KEY_I:
                    // Surround the message with the stored emote
                    mMod.text = cttvSelectedEmote + ' ' + mMod.text + ' ' + cttvSelectedEmote;
                    break;

                case keycodes.KEY_L:
                    // Remove the last word, repeat the message, then insert the last word at the end
                    tempText = mMod.text.split(' ');
                    tempLast = tempText.pop();
                    tempText = tempText.concat(tempText);
                    tempText.push(tempLast);
                    mMod.text = tempText.join(' ');
                    break;

                case keycodes.KEY_J:
                    // Take the first word in message and insert it in every space + start and end
                    tempText = mMod.text.split(' ');
                    tempEmote = tempText.shift();
                    tempText = tempText.join(' ');
                    mMod.text = tempEmote + ' ' + tempText.replace(regExSpaces, ' ' + tempEmote + ' ') +
                        ' ' + tempEmote;
                    break;

                case keycodes.KEY_U:
                    // Take the first word in message and insert it in start and end
                    tempText = mMod.text.split(' ');
                    tempText.push(tempText[0]);
                    mMod.text = tempText.join(' ');
                    break;

                case keycodes.SPACE:
                    // Add spaces between every letter
                    mMod.text = mMod.text.split('').join(' ');
                    break;

                // BEGIN NUMBERS
                case keycodes.KEY_1:
                case keycodes.KEY_2:
                case keycodes.KEY_3:
                case keycodes.KEY_4:
                case keycodes.KEY_5:
                case keycodes.KEY_6:
                case keycodes.KEY_7:
                case keycodes.KEY_8:
                case keycodes.KEY_9:
                case keycodes.KEY_0:
                    if (!enableStoredPastaKeys) {
                        switchFocus = false;
                        break;
                    }
                    var storedNum = (keyCode === keycodes.KEY_0 ? 9 : keyCode - 49);
                    debug('CTTV: ' + storedNum);
                    if (e.shiftKey) {
                        setStoredPasta(storedNum, ($chatBox.val() === '' ? lastMessage : $chatBox.val()));
                        switchFocus = false;
                        e.preventDefault();
                        break;
                    }
                    mMod.text = storedPasta[storedNum];
                    keyNumber = true;
                    autoSend = true;
                    break;
            }
            if (switchFocus) {
                if (!keyNumber) {
                    mMod.restoreSlashMeme();
                }
                $chatBox.val(mMod.text).focus();
                onChatBoxChange();
                e.preventDefault();
                if (autoSend) {
                    doAutoSend();
                }
            }
        }
        if (!switchFocus) {
            onChatBoxKeyDown(e);
        }
    }
    document.addEventListener('keydown', dockeydown);
    cleanupFunctionsOneTime.push(function () {
        document.removeEventListener('keydown', dockeydown);
    });

    function windowblur() {
        cleanupCtrlDown();
    }
    window.addEventListener('blur', windowblur);
    cleanupFunctionsOneTime.push(function () {
        window.removeEventListener('blur', windowblur);
    });

    function dockeyup(e) {
        var keyCode = e.keyCode || e.which;

        if (keyCode === keycodes.CTRL) {
            cleanupCtrlDown();
        }
    }
    document.addEventListener('keyup', dockeyup);
    cleanupFunctionsOneTime.push(function () {
        document.removeEventListener('keyup', dockeyup);
    });

    function cleanupCtrlDown () {
        $chatMessageArea.off('mousedown');
        if (chatOnClickCssTag) chatOnClickCssTag.remove();
        showHelpPopup(false);
        ctrlIsHeld = false;
    }

    function showHelpPopup (show) {
        if (showHelpPopupQuestionMark) {
            if (show) {
                $helpPopup.addClass('help-popup-cttv-visible');
            }
            else {
                $helpPopup.removeClass('help-popup-cttv-visible');
            }
        }
    }

    if (firstTime) {
        var helpText = $('<div style="z-index: 99999; display: flex; justify-content: center; align-items: center; position: absolute; top: 0px;' +
            'left: 0px; width: 100%; height: 100%; text-align: center; white-space: nowrap; background-color: rgba(203, 203, 203, 0.4);' +
            'box-shadow: 0px 0px 12px rgba(203, 203, 203, 0.4);">' +
            '<span style="vertical-align: middle; text-shadow: rgb(180, 0, 255) 0px 0px 15px; color: rgb(255, 255, 255); font-size: 25px;' +
            'margin-left: -100%; margin-right: -100%;">' +
            'Hold CTRL for Cancer</span></div>').appendTo($chatBox.parent());
        helpText.on('click', function () {
            helpText.remove();
        });
        function firstCtrl (e) {
            var keyCode = e.which || e.keyCode;
            if (keyCode === keycodes.CTRL) {
                helpText.remove();
                firstTime = false;
                window.localStorage.setItem('cttvFirstTime', 'false');
                document.removeEventListener('keydown', firstCtrl);
            }
        }
        document.addEventListener('keydown', firstCtrl);
        cleanupFunctionsOneTime.push(function () {
            document.removeEventListener('keydown', firstCtrl);
        });
    }

    if (devDebug) $chatBox.val('haHAA');
}

function waitForChatLoad() {
    window.addEventListener('cancerttv-start', function () {
        main();
    });
}
waitForChatLoad();

function disableCttv() {
    window.addEventListener('cancerttv-end', function () {
        for (var i = 0; i < cleanupFunctionsOneTime.length; i++) {
            cleanupFunctionsOneTime[i]();
        }
        for (i = 0; i < cleanupFunctions.length; i++) {
            cleanupFunctions[i]();
        }
        cleanupFunctionsOneTime = [];
    });
}
disableCttv();

// Handle message modifications
function MessageModification(text) {
    this.foundSlashMeme = false;
    this.text = text;
    this.disableCleanup = false;
    this.checkSlashMeme = function () {
        if (this.text.indexOf('/me ') === 0) {
            this.text = this.text.slice(4);
            this.foundSlashMeme = true;
        }
        return this.text;
    };
    this.restoreSlashMeme = function () {
        if (this.foundSlashMeme && !this.disableCleanup) {
            this.text = this.text.insertAt(0, '/me ');
        }
        return this.text;
    };
}

// Logging
function debug(message) {
    if (devDebug) {
        console.log(message);
    }
}

// Returns a value between 0 and 1
function scaleNumber (num, min, max) {
    return (num - min) / (max - min);
}

// Returns num between originalMin and originalMax scaled up to between scaledMin and scaledMax
function scaleNumberRange (num, originalMin, originalMax, scaledMin, scaledMax) {
    return scaleNumber(num, originalMin, originalMax) * (scaledMax - scaledMin) + scaledMin;
}

// Same as above but inverted (if num = scaledMax it returns scaledMin)
function scaleNumberRangeInverse (num, originalMin, originalMax, scaledMin, scaledMax) {
    return (1 - scaleNumber(num, originalMin, originalMax)) * (scaledMax - scaledMin) + scaledMin;
}

// Thank you stack overflow
String.prototype.insertAt = function (index, string) {
    return this.substr(0, index) + string + this.substr(index);
};
function rgb(r, g, b) {
    return 'rgb(' + Math.floor(r) + ',' + Math.floor(g) + ',' + Math.floor(b) + ')';
}

// Thank you guy in google search results for this
var keycodes = {
    BACKSPACE: 8,
    TAB: 9,
    ENTER: 13,
    SHIFT: 16,
    CTRL: 17,
    ALT: 18,
    PAUSE: 19,
    CAPS_LOCK: 20,
    ESCAPE: 27,
    SPACE: 32,
    PAGE_UP: 33,
    PAGE_DOWN: 34,
    END: 35,
    HOME: 36,
    LEFT_ARROW: 37,
    UP_ARROW: 38,
    RIGHT_ARROW: 39,
    DOWN_ARROW: 40,
    INSERT: 45,
    DELETE: 46,
    KEY_0: 48,
    KEY_1: 49,
    KEY_2: 50,
    KEY_3: 51,
    KEY_4: 52,
    KEY_5: 53,
    KEY_6: 54,
    KEY_7: 55,
    KEY_8: 56,
    KEY_9: 57,
    KEY_A: 65,
    KEY_B: 66,
    KEY_C: 67,
    KEY_D: 68,
    KEY_E: 69,
    KEY_F: 70,
    KEY_G: 71,
    KEY_H: 72,
    KEY_I: 73,
    KEY_J: 74,
    KEY_K: 75,
    KEY_L: 76,
    KEY_M: 77,
    KEY_N: 78,
    KEY_O: 79,
    KEY_P: 80,
    KEY_Q: 81,
    KEY_R: 82,
    KEY_S: 83,
    KEY_T: 84,
    KEY_U: 85,
    KEY_V: 86,
    KEY_W: 87,
    KEY_X: 88,
    KEY_Y: 89,
    KEY_Z: 90,
    LEFT_META: 91,
    RIGHT_META: 92,
    SELECT: 93,
    NUMPAD_0: 96,
    NUMPAD_1: 97,
    NUMPAD_2: 98,
    NUMPAD_3: 99,
    NUMPAD_4: 100,
    NUMPAD_5: 101,
    NUMPAD_6: 102,
    NUMPAD_7: 103,
    NUMPAD_8: 104,
    NUMPAD_9: 105,
    MULTIPLY: 106,
    ADD: 107,
    SUBTRACT: 109,
    DECIMAL: 110,
    DIVIDE: 111,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123,
    NUM_LOCK: 144,
    SCROLL_LOCK: 145,
    SEMICOLON: 186,
    EQUALS: 187,
    COMMA: 188,
    DASH: 189,
    PERIOD: 190,
    FORWARD_SLASH: 191,
    GRAVE_ACCENT: 192,
    OPEN_BRACKET: 219,
    BACK_SLASH: 220,
    CLOSE_BRACKET: 221,
    SINGLE_QUOTE: 222
};