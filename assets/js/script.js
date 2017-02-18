/* jslint browser: true */
/* jslint jquery: true */
/*global $, $$, mockup, SC:true */

window.$ = window.jQuery = require('jquery');

'use strict';

var cache = {};

$(function () {

    cache = {
        version: '0.1',
        testKeyword: 'coldplay',
        test: true,
        debug: true,
        dev: window.location.hash.substring(1) === 'dev',
        keyupDebounceDelay: 500,
        devLoaderDelay: 500,
        devPlayerLoaderDelay: 0,
        init: {
            grid: true
        },
        // devPlayerLoaderDelay: 1500,
        clientId: 'd3cc13db45cba4f1ff6846dc46b0ef8a',
        widgetUrl: 'https://w.soundcloud.com/player/?url=http://api.soundcloud.com/tracks/1848538',
        truncatedTitleLength: 20,
        played: [],
        queryOptions: {
            limit: 50,
        },
        $window: $(window)
    };

    var selectors = [
        '#body',
        '#main-container',
        '#main',
        '#mask',
        '#header',
        '#audio',
        '#player-playPause',
        '#player-stop',
        '#player-replay',
        '#player-next',
        '#player-previous',
        '#progress-bar',
        '#playing',
        '#playing-thumbnail',
        '#playing-title',
        '#playing-artist',
        '#nav',
        '#search',
        '#menu',
        '#list',
        '#player',
        '.toggle-grid-view',
        '.toggle-repeat',
        '.toggle-shuffle',
    ];

    selectors.forEach(function (selector) {
        try {
            /* beautify ignore:start */
            var _selector = selector;
            _selector = _selector.replace(/[#]/g, '')
                                    .replace(/\./g, '')
                                        .replace(/[-]/g, '_');
            /* beautify ignore:end */
            cache['$' + _selector] = $$(selector);
        } catch (e) {
            console.error('invalid selector!');
        }
    });

    function togglePlayPause() {
        var node = cache.$player_playPause[0];
        if (cache.player.paused || cache.player.isPlaying()) {
            changeButtonType(node, '&#9654;&nbsp;play');
            // changeButtonType(node, '&#x025B8;&nbsp;play');
            cache.player.pause();
        } else {
            changeButtonType(node, '&#10073;&#10073;&nbsp;pause');
            cache.player.play();
        }
    }

    function changeButtonType(btn, value) {
        btn.innerHTML = value;
    }

    function msToHMS(ms) {
        var seconds = ms / 1000;
        var hours = parseInt(seconds / 3600, 10);
        if (hours && hours < 9)
            padWithZero(hours);
        seconds = seconds % 3600;
        var minutes = parseInt(seconds / 60, 10);
        if (minutes) {
            if (minutes < 9)
                padWithZero(minutes);
        } else
            minutes = '00';
        seconds = Math.floor(seconds % 60);
        if (seconds < 10)
            seconds = padWithZero(seconds);
        else if (seconds < 1)
            seconds = '00';
        return (hours ? (hours + ':') : '') + minutes + ':' + seconds;
    }

    function padWithZero(val) {
        return ('0' + val).slice(-2);
    }

    function drawItems(tracks, options) {
        options = $.extend({}, options);
        var markup = '';
        var counter = 0;
        var duration;
        if (tracks.length) {
            tracks.forEach(function (track) {
                if (!track.custom) {
                    track.custom = splitTrackTitle($('<p>' + track.title + '</p>').text());
                }
                if (track.artwork_url) {
                    counter++;
                    track.artwork_url = track.artwork_url.replace(/large/g, 't300x300');
                    if (cache.dev) {
                        track.artwork_url.replace(/https:\/\/i1.sndcdn.com/g, 'assets/images/mockup');
                    }
                }
                //&mdash;
                markup += '<div class="list__item' + (!track.artwork_url ? ' list__item--no-artwork' : '') + '">';
                markup += '<span class="list__thumbnail" style="' + (track.artwork_url ? 'background-image: url(' + track.artwork_url + ')' : '') + '">';
                markup += '<i class="list__icon"></i>';
                markup += '<span class="list__playing-animation-wrapper"><i class="list__playing-animation loader2"></i><span class="sr-only">Loading...</span></span>';
                if (track.genre) {
                    markup += '<span class="list__tag" title="' + track.genre + '">#' + track.genre + '</span>';
                }
                // markup += '<span class="list__truncated">' + track.title.substring(0, cache.truncatedTitleLength) + '</span>';
                markup += '</span>';
                markup += '<ul class="list__list">';
                markup += '<li class="list__track-title" title="' + track.custom.title + '">' + track.custom.title + '</li>';
                markup += '<li class="list__track-meta">';
                markup += '<small class="list__track-author" title="' + track.user.username + '">' + track.user.username + '</small>';
                // markup += '&nbsp;&ndash;&nbsp;';
                duration = msToHMS(track.duration);
                markup += '<small class="list__track-duration" title="' + duration + '">' + duration + '</small>';
                // markup += '<small class="list__track-views">views: ' + track.playback_count + '</small>';
                markup += '</li>';
                markup += '</div>';
            });
            console.info('total tracks:', tracks.length);
            console.info('total art-covers:', counter);
        } else {
            markup = '<div class="list__item">Your search - <b>' + cache.searchQuery + '</b> - did not match any tracks.</div>';
            cache.$body.removeClass('body--show-grid-view');
        }
        cache.$items = cache.$list.toggleClass('no-results', !tracks.length)[options.append ? 'append' : 'html'](markup);
        cache.$items = cache.$items.children();
    }

    function updateProgressBar(reset) {
        if (!cache.player.streamInfo) {
            reset = true;
        }
        var el = cache.$progress_bar[0],
            percentage = reset ? 0 : Math.ceil((100 / cache.player.streamInfo.duration) * cache.player.currentTime());
        el.value = percentage;
        // Update the progress bar's text (for browsers that don't support the progress element)
        el.innerHTML = percentage + '% played';
    }

    function replayTrack() {
        // $items = $('.list__item', cache.$list).get(cache.index).click();
        // $items.get(cache.index).click();
        updateProgressBar(true);
        cache.player.seek(0);
        cache.player.play();
    }

    function previousTrack() {
        var previousIndex = cache.index - 1,
            $items = $('.list__item', cache.$list);
        if (cache.tracks[cache.offset][previousIndex]) {
            $items.get(previousIndex).click();
        } else if (cache.repeat) {
            $items.get(0).click();
        }
    }

    function nextTrack() {
        cache.played.push(cache.index);
        var nextIndex = cache.index + 1,
            $items = $('.list__item', cache.$list);
        if (cache.shuffle) {
            var randomIndex = getRandomTrackIndex();
            if (cache.tracks[cache.offset][randomIndex]) {
                $items.get(randomIndex).click();
            }
        } else if (cache.tracks[cache.offset][nextIndex]) {
            $items.get(nextIndex).click();
        } else if (cache.repeat) {
            $items.get(0).click();
        }
    }

    // TODO: re-factor semantics
    function getTracks(query, offset) {
        var fetch;
        if (offset) {
            fetch = $.get(query);
        } else {
            var queryURI = '/tracks?' + $.param($.extend({}, cache.queryOptions, {
                q: query,
                linked_partitioning: true
            }));
            cache.query = [];
            cache.query.push(queryURI);
            fetch = SC.get(queryURI);
        }
        // handle response
        fetch.then(function (response) {
            if (cache.dev) {
                cache.response = response; // dev-only
            }
            if (response.collection) {
                if (!cache.tracks || !offset) {
                    cache.$main.scrollTop(0);
                    cache.tracks = [];
                    cache.offset = 0;
                }
                cache.tracks.push(response.collection);
                // is paginated response?
                if (response.next_href) {
                    cache.query.push(response.next_href);
                }
            }
            drawItems(cache.tracks[cache.offset], {
                append: offset || false
            });
        });
    }

    function isEmptyResult() {
        return cache.query.length && cache.tracks[0].length === 0;
    }

    function getRandomTrackIndex() {
        var randomIndex = getRandomInt(0, cache.tracks[cache.offset].length - 1);
        if ($.inArray(randomIndex, cache.played) >= 0) {
            if (cache.played.length === cache.tracks[cache.offset]) {
                if (cache.debug) {
                    console.log('played all songs @ offset:', cache.offset);
                }
                return 0;
            }
            getRandomTrackIndex();
        }
        return randomIndex;
    }

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    function updateHeaderView() {
        cache.header__height = cache.$header.outerHeight();
        // cache.$main.css('padding-top', 'calc(' + cache.header__height + 'px + 1rem)');
        // cache.$main.css('top', 'calc(' + cache.header__height + 'px + 1rem)');
        // console.log(cache.header__height);
        // cache.$main.css({
        // transform: 'translateY(' + (cache.header__height + 1) + 'px)',
        // height: 'calc(100% - ' + cache.header__height + 'px - 2rem - 1px)'
        // });
    }

    function updateFooterView() {
        // cache.pagination__height = cache.$pagination.outerHeight();
        // cache.$main.css('margin-bottom', 'calc(' + cache.pagination__height + 'px + 1rem)');
    }

    function showPlayer() {
        cache.$player.removeClass('hidden');
        updateHeaderView();
    }

    function splitTrackTitle(raw) {
        var tmp = raw.split('-');
        return {
            artist: tmp[1] || '',
            title: tmp[0] || '',
        };
    }

    function init() {

        console.info('app version:', cache.version);

        cache.$audio[0].controls = false;
        // cache.header__height = cache.$header.outerHeight();
        cache.$body.removeClass('body--show-loader');

        // updateHeaderView();

        /* bind events */

        cache.$list.on('click', '.list__item', function () {
            // detect no-results
            if (isEmptyResult()) {
                return;
            }
            var $item = $(this),
                track = cache.tracks[cache.offset][$item.index()],
                hasArtCover = track.artwork_url ? true : false;
            // abort if user hit a playing track
            if (cache.index === $item.index()) {
                return;
            }
            /* beautify ignore:start */
            $item.addClass('list__item--selected');
            $item.find('.list__playing-animation').addClass('spin');
            if (typeof cache.index !== 'undefined') {
                $(cache.$items.get(cache.index))
                                .removeClass('list__item--selected')
                                    .addClass('list__item--visited')
                                        .find('.list__playing-animation').removeClass('spin');
            }
            cache.$mask.css('background-image', 'url(' + (track.artwork_url || '') + ')');
            // cache.$body.addClass('body--show-playing').toggleClass('body--show-mask', hasArtCover);
            cache.$body.toggleClass('body--show-mask', hasArtCover).toggleClass('body--animate-mask', hasArtCover);
            cache.$playing.toggleClass('playing--no-artcover', !hasArtCover);
            cache.$playing_title.text(track.custom.title); // .html can cause script-tag execution
            cache.$playing_artist.text(track.custom.artist);
            if (hasArtCover) {
                cache.$playing_thumbnail.css('background-image', 'url(' + track.artwork_url + ')');
            } else {
                cache.$playing_thumbnail.css('background-image', 'none');
            }
            cache.index = $item.index();
            updateFooterView();
            /* beautify ignore:end */
            setTimeout(function () {
                SC.stream('/tracks/' + track.id).then(function (player) {
                    // avoid triggering flash, as per: https://github.com/soundcloud/soundcloud-javascript/issues/39
                    if (player.options.protocols[0] === 'rtmp') {
                        player.options.protocols.splice(0, 1);
                    }
                    if (cache.player && cache.player.isPlaying()) {
                        cache.player.pause();
                    }
                    cache.player = player;
                    cache.player.on('created', function () {
                        if (!cache.$player.is(':visible')) {
                            showPlayer();
                        }
                    }).on('play-start', function () {
                        // updateProgressBar(true);
                    }).on('finish', function () {
                        nextTrack();
                    }).on('time', function () {
                        updateProgressBar();
                    });
                    cache.$player_playPause.click();
                    if (cache.debug) {
                        console.info('playing:', track.title);
                    }
                });
            }, cache.dev ? cache.devPlayerLoaderDelay : 0);
        });

        cache.$player__buttons = $('.btn', cache.$player).click(function () {
            // var $btn = $(this);
            switch (this.id.replace(/player-/g, '')) {
            case 'playPause':
                togglePlayPause();
                break;
            case 'next':
                nextTrack();
                break;
            case 'previous':
                previousTrack();
                break;
            case 'replay':
                replayTrack();
                break;
            }
        });

        cache.$nav__buttons = $('.btn', cache.$nav).click(function () {
            var $btn = $(this),
                action = $btn.data('action'),
                toggle = $btn.data('toggle'),
                dismiss = $btn.data('dismiss');
            if (toggle) {
                $btn.addClass('hidden');
                cache.$nav__buttons.filter('[data-modifier = ' + toggle + ']').not(this).removeClass('hidden');
                cache.$body.toggleClass(toggle);
                if (dismiss) {
                    cache.$menu.click();
                }
                return;
            }
            switch (action) {
            case 'shuffle':
                cache.shuffle = cache.shuffle ? false : true;
                break;
            case 'repeat':
                cache.repeat = cache.repeat ? false : true;
                break;
            }
            $btn.addClass('btn--selected');
        });

        cache.$progress_bar.click(function (e) {
            var posX = e.pageX - $(this).position().left;
            if (cache.player.isPlaying()) {
                cache.player.seek(posX / cache.$progress_bar.width() * cache.tracks[cache.offset][cache.index].duration);
            }
        });

        // TODO: remove
        // cache.$prev.click(function () {
        //     drawItems(cache.tracks[--cache.offset]);
        //     cache.$prev.toggle(cache.offset ? true : false);
        //     var isMoreTracks = cache.tracks[cache.offset + 1] || cache.query[cache.offset + 1];
        //     cache.$next.toggle(isMoreTracks ? true : false);
        // });

        cache.$main.scroll(function () {
            var $this = $(this);
            var scrollPosition = $this.scrollTop() + $this.outerHeight();
            var totalHeight = this.scrollHeight +
                parseInt($this.css('padding-top'), 10) +
                parseInt($this.css('padding-bottom'), 10) +
                parseInt($this.css('border-top-width'), 10) +
                parseInt($this.css('border-bottom-width'), 10);
            if (scrollPosition == totalHeight) {
                if (cache.tracks[cache.offset + 1]) {
                    drawItems(cache.tracks[++cache.offset]);
                } else if (cache.query[cache.offset + 1]) {
                    getTracks(cache.query[++cache.offset], true);
                }
            }
        });

        cache.$search.keyup($.debounce(cache.keyupDebounceDelay, function () {
            if (this.value === '') {
                return;
            }
            cache.searchQuery = this.value;
            getTracks(this.value);
        }));

        cache.$menu.click(function () {
            cache.$body.toggleClass('body--show-menu');
        });

        // now test it ;)
        if (cache.test) {
            cache.$search.val(cache.testKeyword).keyup();

            setTimeout(function () {
                // reset search to debug placeholder
                cache.$search.val('');
            }, cache.keyupDebounceDelay);

            if (cache.init.grid) {
                cache.$menu.click();
                $('[data-toggle = body--show-grid-view]').not('.hidden').click();
            }
        }
    }

    /* beam me up scotty! */

    if (cache.dev) {
        console.warn('initialized development-mode, loaded mockup data...');
        cache.player = mockup.player;
        SC = mockup.SC;
    } else {
        SC.initialize({
            client_id: cache.clientId
        });
    }

    setTimeout(init, cache.dev ? cache.devLoaderDelay : 0);
});