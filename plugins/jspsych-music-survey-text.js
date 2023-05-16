/* jspsych-music-survey-text.js
*
*  Background music plays while questions are presented and responses are submitted
*
*  10May2023 - Petr Janata
*
*/

jsPsych.plugins["music-survey-text"] = (function() {

  var plugin = {};

  jsPsych.pluginAPI.registerPreload('music-survey-text', 'stimulus', 'audio');

  plugin.info = {
    name: 'music-survey-text',
    description: '',
    parameters: {
      stimulus: {
        type: jsPsych.plugins.parameterType.AUDIO,
        pretty_name: 'Stimulus',
        default: null,
        description: 'The audio to be played.'
      },
      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: null,
        description: 'The maximum duration to wait for a response.'
      },
      trial_ends_after_audio: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Trial ends after audio',
        default: false,
        description: 'If true, then the trial will end as soon as the audio file finishes playing.'
      },
      convert_sec_to_ms: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Convert time values in sec to msec',
        default: true,
        description: 'Convert time values in seconds to milliseconds.'
      },
      click_to_start: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Button to start sound',
        default: true,
        description: 'If true, requires button click for trial to start.'
      },
      questions: {
        type: jsPsych.plugins.parameterType.COMPLEX,
        array: true,
        pretty_name: 'Questions',
        default: undefined,
        nested: {
          // prompt: {
          //   type: jsPsych.plugins.parameterType.STRING,
          //   pretty_name: 'Prompt',
          //   default: undefined,
          //   description: 'Prompt for the subject to response'
          // },
          // placeholder: {
          //   type: jsPsych.plugins.parameterType.STRING,
          //   pretty_name: 'Placeholder',
          //   default: "",
          //   description: 'Placeholder text in the textfield.'
          // },
          rows: {
            type: jsPsych.plugins.parameterType.INT,
            pretty_name: 'Rows',
            default: 1,
            description: 'The number of rows for the response text box.'
          },
          columns: {
            type: jsPsych.plugins.parameterType.INT,
            pretty_name: 'Columns',
            default: 6,
            description: 'The number of columns for the response text box.'
          },
          required: {
            type: jsPsych.plugins.parameterType.BOOL,
            pretty_name: 'Required',
            default: true,
            description: 'Require a response'
          },
          name: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: 'Question Name',
            default: '',
            description: 'Controls the name of data values associated with this question'
          }
        }
      },
      question_prompt_template: {
        type: jsPsych.plugins.parameterType.STRING,
        default: '<div id="question-prompt-template"></div>',
      },
      preamble: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Preamble',
        default: null,
        description: 'HTML formatted string to display at the top of the page above all the questions.'
      },
      button_label: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Button label',
        default:  'Continue',
        description: 'The text that appears on the button to finish the trial.'
      },
      autocomplete: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Allow autocomplete',
        default: false,
        description: "Setting this to true will enable browser auto-complete or auto-fill for the form."
      }
    }
  }

  plugin.trial = function(display_element, trial) {

    // setup stimulus
    var context = jsPsych.pluginAPI.audioContext();
    var audio;
    var end_time = 0;

    // store response
    var run_events = [];

    // List of remaining questions
    var remaining_questions = trial.questions;

    var response_data = {
        time: null,
        type: null,
        stimulus: null,
        key_press: null,
        ITI: null
    };

    var music_data = {
        time: null,
        type: null,
        stimulus: null,
        key_press: null,
        ITI: null
    };

    var response = {
      rt: null,
      key: null
    };

    // load audio file
    if (trial.stimulus){
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
          setup_trial();
        })
        .catch(function (err) {
          console.error(`Failed to load audio file "${trial.stimulus}". Try checking the file path. We recommend using the preload plugin to load audio files.`)
          console.error(err)
        });
    } else {
      setup_trial();
    }

    ///////////////////////////////////////////////////
    function setup_trial() {
      // set up the survey form
      construct_survey_form();

      // set up end event if trial needs it
      if (trial.trial_ends_after_audio) {
        audio.addEventListener('ended', end_trial);
      }

      // Either start the trial or wait for the user to click start
      if(!trial.click_to_start || context==null){
        set_end_trial();

        if (trial.stimulus) start_audio();

        next_action();

      } else {
        // Register callback for start sound button if we have one
        $('#start_button').on('click', function(ev){
          ev.preventDefault();

          // Hide this button
          $(ev.target).hide();

          // Fix for Firefox not blurring the button
          if (document.activeElement == this){
            jsPsych.getDisplayContainerElement().focus();
          }

          set_end_trial();

          if (trial.stimulus) start_audio();

          next_action();

        })
      }

    }

    function set_end_trial(){
      // end trial if time limit is set
      if(trial.trial_duration !== null) {
        jsPsych.pluginAPI.setTimeout(function() {
          end_trial();
        }, trial.trial_duration); 
      }      
    }

    //////////////////////////////////////////////////////////////////////

    // function to end trial when it is time
    function end_trial() {
      // kill any remaining setTimeout handlers
      jsPsych.pluginAPI.clearAllTimeouts();

      // stop the audio file if it is playing
      // remove end event listeners if they exist
      if (trial.stimulus){
        if (context !== null) {
          audio.stop();
        } else {
          audio.pause();
        }

        audio.removeEventListener('ended', end_trial);
      }

      // clear the display
      display_element.innerHTML = '';

      // move on to the next trial
      jsPsych.finishTrial(run_events);
    };

    function construct_survey_form(){
      var html = '';

      // Create an enclosing div
      html += '<div id="jpsych-survey">'

      // show preamble text
      if(trial.preamble !== null){
        html += '<div id="jspsych-survey-text-preamble" class="jspsych-survey-text-preamble">'+trial.preamble+'</div>';
      }

      // start form
      if (trial.autocomplete) {
        html += '<form id="jspsych-survey-text-form" class="d-none">';
      } else {
        html += '<form id="jspsych-survey-text-form" class="d-none" autocomplete="off">';
      }

      // Add a div to hold the current question. Only present one question at a time.
      html += '<div id="jspsych-survey-text" class="jspsych-survey-text-question" style="margin: 2em 0em;">';

      // The question prompt
      html += '<div id="question-prompt" class="jspsych-survey-text">'+trial.question_prompt_template+'</div>';

      // Input field
      html += '<input type="text" id="survey-text-input" class="text-center" name="#jspsych-survey-text-response" data-name="" size="6" autofocus required placeholder=""></input>';

      html += '</div>';

      // add submit button
      html += '<input type="submit" id="jspsych-survey-text-next" class="jspsych-btn jspsych-survey-text" value="'+trial.button_label+'"></input>';

      // close form
      html += '</form>';

      // close survey div
      html += '</div';

      // Populate the display element with our form
      display_element.innerHTML = html;

      // Attach our submit handler
      display_element.querySelector('#jspsych-survey-text-form').addEventListener('submit', function(e) {
        e.preventDefault();

        // measure response time
        var endTime = performance.now();
        var response_time = endTime - startTime;

        // Hide the div containing the survey
        document.getElementById("jspsych-survey-text-form").classList.add("d-none");

        let response_input = document.getElementById('survey-text-input');

        run_events.push({
          question_data: question.data,
          response: response_input.value,
          response_time: response_time
        });

        // Clear our prompt and reset the value
        document.getElementById("question-prompt").innerHTML = "";
        response_input.value = "";

        // Take our next action
        next_action();
      });

    }

    function next_action(){
      // Get our question
      question = remaining_questions.pop();

      // Present the question
      if (question) populate_question(question);
    }


    function populate_question(question){
      // Set the questionm template
      document.getElementById("question-prompt").innerHTML = trial.question_prompt_template;

      // Populate the question template with our data
      populate_question_template(question);

      // Show the div
      document.getElementById("jspsych-survey-text-form").classList.remove("d-none");

      // Start the response timer
      startTime = performance.now()
    }

    function populate_question_template(question){
      $("#question-prompt-template #operand-1").html(question.data.operand1);
      $("#question-prompt-template #operator").html(question.data.operator);
      $("#question-prompt-template #operand-2").html(question.data.operand2);
    }

    // Embed the rest of the trial into a function so that we can attach to a button if desired
    function start_audio(){
      // start audio
      if (context !== null) {
        startTime = context.currentTime;
        audio.start(startTime);
      } else {
        audio.play(); 
      }


      music_data.stimulus = trial.stimulus.replace(/^.*[\\\/]/, '');

      // The music context is in seconds, so we need to convert to msec so that we are on the same time basis as the responses
      music_data.time = trial.convert_sec_to_ms ? Math.round(context.currentTime * 1000): context.currentTime;
      music_data.key_press = null;
      music_data.type = 'audio_onset';
     
      run_events.push(music_data);

      // start the response listener
      // if(context !== null) {
      //   var keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
      //     callback_function: after_response,
      //     valid_responses: trial.choices,
      //     rt_method: 'audio',
      //     persist: true,
      //     allow_held_key: false,
      //     audio_context: context,
      //     audio_context_start_time: startTime
      //   });
      // } else {
      //   var keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
      //     callback_function: after_response,
      //     valid_responses: trial.choices,
      //     rt_method: 'performance',
      //     persist: true,
      //     allow_held_key: false
      //   });
      // }

      
    };

  };

  return plugin;
})();
