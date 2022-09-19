/**
 * jspsych-music-image-sequenceuence
 * Petr Janata 18Sep2022
 *
 * plugin for presenting multiple frames of images (and accompanying text)
 * in a sequence while an auditory stimulus plays in the background
 *
 * 
 *
 **/


jsPsych.plugins["music-image-sequence"] = (function() {

  var plugin = {};

  jsPsych.pluginAPI.registerPreload('music-image-sequence', 'stimulus', 'audio');

  // Have to figure out how to dynamically handle the image preload
  jsPsych.pluginAPI.registerPreload('music-image-sequence', 'image', 'image');
  jsPsych.pluginAPI.registerPreload('music-image-sequence', 'imageLoc', 'image');
  jsPsych.pluginAPI.registerPreload('music-image-sequence', 'imageJob', 'image');
  jsPsych.pluginAPI.registerPreload('music-image-sequence', 'imageHob', 'image');
  jsPsych.pluginAPI.registerPreload('music-image-sequence', 'imageRel', 'image');

  plugin.info = {
    name: 'music-image-sequence',
    description: '',
    parameters: {
      stimulus: {
        type: jsPsych.plugins.parameterType.AUDIO,
        pretty_name: 'Stimulus',
        default: undefined,
        description: 'The audio to be played.'
      },

      frames: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Frames',
        default: undefined,
        array: true,
        description: 'The list of frames containg information to be displayed in sequence'
      },

      choices: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        pretty_name: 'Choices',
        array: true,
        default: jsPsych.ALL_KEYS,
        description: 'The keys the subject is allowed to press to respond to the stimulus.'
      },

      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed below the stimulus.'
      },

      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: null,
        description: 'The maximum duration to wait for a response.'
      },

      response_ends_trial: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Response ends trial',
        default: true,
        description: 'If true, the trial will end when user makes a response.'
      },

      trial_ends_after_audio: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Trial ends after audio',
        default: false,
        description: 'If true, then the trial will end as soon as the audio file finishes playing.'
      },

      displayQuestionsAtStart: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'questions at start',
        default: false,
        description: 'If true, display pyensemble questions at start of trial.'
      },

      click_to_start: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Button to start sound',
        default: true,
        description: 'If true, requires button click for trial to start.'
      }
    }
  }

  plugin.trial = function(display_element, trial) {

    // setup stimulus
    var context = jsPsych.pluginAPI.audioContext();
    var audio;

    // store response
    var trial_data = {
        "sound": trial.stimulus.replace(/^.*[\\\/]/, ''),
        "picture": trial.image.replace(/^.*[\\\/]/, ''),
      };

    var response = {
      rt: null,
      key: null
    };

    // record webaudio context start time
    var startTime;

    // load audio file
    jsPsych.pluginAPI.getAudioBuffer(trial.stimulus)
      .then(function (buffer) {
        if (context !== null) {
          audio = context.createBufferSource();
          audio.buffer = buffer;
          audio.connect(context.destination);
        } else {
          audio = buffer;
          audio.currentTime = 0;
        }
        setupTrial();
      })
      .catch(function (err) {
        console.error(`Failed to load audio file "${trial.stimulus}". Try checking the file path. We recommend using the preload plugin to load audio files.`)
        console.error(err)
      });

    function setupTrial() {
      // set up end event if trial needs it
      if (trial.trial_ends_after_audio) {
        audio.addEventListener('ended', end_trial);
      }

      // show prompt if there is one
      if (trial.prompt !== null) {
        display_element.innerHTML = trial.prompt;
      }


      /////////////////////////////////
      // Either start the trial or wait for the user to click start
      if(!trial.click_to_start || context==null){
        start_audio();
      } else {
        // Register callback for start sound button if we have one
        $('#start_button').on('click', function(ev){
          ev.preventDefault();

          // Fix for Firefox not blurring the button
          if (document.activeElement == this){
            jsPsych.getDisplayContainerElement().focus();
          }

          start_audio();
        })
      }


    }



    // function to end trial when it is time
    function end_trial() {
      // kill any remaining setTimeout handlers
      jsPsych.pluginAPI.clearAllTimeouts();

      // stop the audio file if it is playing
      // remove end event listeners if they exist
      if (context !== null) {
        audio.stop();
      } else {
        audio.pause();
      }

      audio.removeEventListener('ended', end_trial);
      //audio.removeEventListener('ended', setup_keyboard_listener);


      // kill keyboard listeners
      jsPsych.pluginAPI.cancelAllKeyboardResponses();

      /*
      // gather the data to store for the trial
      if(context !== null && response.rt !== null){
        response.rt = Math.round(response.rt * 1000);
      }
      var trial_data = {
        "rt": response.rt,
        "stimulus": trial.stimulus,
        "key_press": response.key
      };
      */
      //add info for vtargets


      // clear the display
      display_element.innerHTML = '';

      // move on to the next trial
      jsPsych.finishTrial(trial_data);
    };

    // function to handle responses by the subject


    // Embed the rest of the trial into a function so that we can attach to a button if desired
    function start_audio(){

      var wait_time = 0;
      var wait_int = 2000;

      // start audio
      if (context !== null) {
        startTime = context.currentTime;
        audio.start(startTime);
      } else {
        audio.play();
      }

      // end trial if time limit is set
      if (trial.trial_duration !== null) {
        jsPsych.pluginAPI.setTimeout(function() {
          end_trial();
        }, trial.trial_duration);
      }

      
      /////////////////////////first time
      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageLoc+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioLoc;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
      wait_time = wait_time + wait_int;

      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageJob+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioJob;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
       wait_time = wait_time + wait_int;

      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageHob+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioHob;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
      wait_time = wait_time + wait_int;

      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageRel+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioRel;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
      wait_time = wait_time + wait_int;
      // full time through 4

      /////////////////////////second time
      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageLoc+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioLoc;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
      wait_time = wait_time + wait_int;

      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageJob+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioJob;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
       wait_time = wait_time + wait_int;

      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageHob+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioHob;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
      wait_time = wait_time + wait_int;

      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageRel+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioRel;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
      wait_time = wait_time + wait_int;
      // full time through 4

      /////////////////////////third time
      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageLoc+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioLoc;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
      wait_time = wait_time + wait_int;

      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageJob+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioJob;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
       wait_time = wait_time + wait_int;

      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageHob+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioHob;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
      wait_time = wait_time + wait_int;

      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageRel+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioRel;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
      wait_time = wait_time + wait_int;
      // full time through 4

      /////////////////////////fourth time
      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageLoc+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioLoc;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
      wait_time = wait_time + wait_int;

      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageJob+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioJob;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
       wait_time = wait_time + wait_int;

      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageHob+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioHob;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
      wait_time = wait_time + wait_int;

      //need a loop here that displays next pic after X seconds
      jsPsych.pluginAPI.setTimeout(function(){
        //need to display to images side by side
        // display stimulus
        var html = '<div class="row"> <div class="column">' +
              '<img src="'+trial.image+'" id="jspsych-music-image-sequence" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div>';

        html += '<div class="column">' +
              '<img src="'+trial.imageRel+'" id="jspsych-music-image-sequence2" style="';
        if(trial.stimulus_height !== null){
          html += 'height:'+trial.stimulus_height+'px; '
          if(trial.stimulus_width == null && trial.maintain_aspect_ratio){
            html += 'width: auto; ';
          }
        }
        if(trial.stimulus_width !== null){
          html += 'width:'+trial.stimulus_width+'px; '
          if(trial.stimulus_height == null && trial.maintain_aspect_ratio){
            html += 'height: auto; ';
          }
        }
        html +='"></img> </div> </div>';

          //show prompt if there is one
        if (trial.biotext !== null) {
          html += trial.bioRel;
        }
        display_element.innerHTML = html;
      },startTime+wait_time);
      wait_time = wait_time + wait_int;
      // full time through 4

      if(trial.displayQuestionsAtStart) {
              $("#questions").removeClass("d-none");
              $("#questions .form-actions input").attr({'disabled':true})
      
      }
      

    }

  };

  return plugin;
})();
