/** @namespace H5P */
H5P.InteractiveVideoInteraction = (function ($, EventDispatcher) {

  /**
   * Keeps control of interactions in the interactive video.
   *
   * @class
   * @param {Object} parameters describes action behavior
   * @param {H5P.InteractiveVideoDialog} dialog instance
   * @param {String} defaultInteractionLabel localization
   * @param {Number} oneSecondInPercentage
   * @param {Number} contentId
   */
  function Interaction(parameters, dialog, defaultInteractionLabel, oneSecondInPercentage, contentId) {
    var self = this;

    // Initialize event inheritance
    EventDispatcher.call(self);

    var instance, $interaction, $label;
    var action = parameters.action;

    // Find library name and title
    var library = action.library.split(' ')[0];
    var title = (action.params.contentName !== undefined ? action.params.contentName : defaultInteractionLabel);

    // Detect custom html class for interaction.
    var classes = parameters.className;
    if (classes === undefined) {
      var classParts = action.library.split(' ')[0].toLowerCase().split('.');
      classes = classParts[0] + '-' + classParts[1] + '-interaction';
    }

    /**
     * Display the current interaction as a button on top of the video.
     *
     * @private
     */
    var createButton = function () {
      $interaction = $('<div/>', {
        'class': 'h5p-interaction ' + classes + ' h5p-hidden',
        css: {
          left: parameters.x + '%',
          top: parameters.y + '%'
        },
        on: {
          click: function () {
            if (!self.dialogDisabled && library !== 'H5P.Nil') {
              openDialog();
            }
          }
        }
      });
      $('<a/>', {
        'class': 'h5p-interaction-button',
        href: '#',
        on: {
          click: function (event) {
            event.preventDefault();
          }
        }
      }).appendTo($interaction);

      // Check to see if we should add label
      if (library === 'H5P.Nil' || (parameters.label && $converter.html(parameters.label).text().length)) {
        $label = $('<div/>', {
          'class': 'h5p-interaction-label',
          html: parameters.label
        }).appendTo($interaction);
      }

      self.trigger('display', $interaction);
      setTimeout(function () {
        // Transition in
        $interaction.removeClass('h5p-hidden');
      }, 0);
    };

    /**
     * Opens button dialog.
     *
     * @private
     */
    var openDialog = function () {
      // Create wrapper for dialog content
      var $dialogContent = $('<div/>', {
        'class': 'h5p-dialog-interaction'
      });

      // Add new instance to dialog and open
      var instance = H5P.newRunnable(action, contentId, $dialogContent);
      dialog.open($dialogContent);

      if (library === 'H5P.Image') {
        // Special case for fitting images
        var max = dialog.getMaxSize($interaction);

        var $img = $dialogContent.find('img');
        if (action.params.file.width && action.params.file.height) {
          // Use the image size info that is stored
          resizeImage($img, max, {
            width: action.params.file.width,
            height: action.params.file.height
          });
        }
        else {
          // Wait for image to load
          $img.load(function () {
            if ($img.is(':visible')) {
              resizeImage($img, max, {
                width: this.width,
                height: this.height
              });
            }
          });
          dialog.position($interaction);
        }
      }
      else if (!(library === 'H5P.Summary' || library === 'H5P.Blanks')) {
        // Only Summary and Blanks uses the dialog that covers the entire video
        dialog.position($interaction);
      }

      if (library === 'H5P.Summary') {
        // Scroll summary to bottom if the task changes size
        var lastHeight = 0;
        instance.$.on('resize', function () {
          var height = $dialogContent.height();
          if (lastHeight > height + 10 || lastHeight < height - 10)  {
            setTimeout(function () {
              dialog.scroll(height, 300);
            }, 500);
          }
          lastHeight = height;
        });
      }

      setTimeout(function () {
        instance.$.trigger('resize');
      }, 0);
    };

    /**
     * Resize the image so that it fits the available dialog space.
     *
     * @private
     * @param {jQuery} $img
     * @param {Object} max width,height in em
     * @param {Object} size width,height in px
     */
    var resizeImage = function ($img, max, size) {
      var fontSize = 16;
      size.width /= fontSize;
      size.height /= fontSize;

      if (size.height > max.height) {
        size.width = size.width * max.height / size.height;
        size.height = max.height;
      }
      if (size.width > max.width) {
        size.height = size.height * max.width / size.width;
        size.width = max.width;
      }

      var fontSizeRatio = 16 / Number($img.css('fontSize').replace('px',''));
      $img.css({
        width: (size.width * fontSizeRatio) + 'em',
        height: (size.height * fontSizeRatio) + 'em'
      });

      // Set dialog size and position
      dialog.position($interaction, size);
    };

    /**
     * Display the current interaction as a poster on top of the video.
     *
     * @private
     */
    var createPoster = function () {
      $interaction = $('<div/>', {
        'class': 'h5p-interaction h5p-poster ' + classes + '',
        css: {
          left: parameters.x + '%',
          top: parameters.y + '%',
          width: (parameters.width ? parameters.width : 10) + 'em',
          height: (parameters.height ? parameters.height : 10) + 'em'
        }
      });
      $inner = $('<div/>', {
        'class': 'h5p-interaction-inner'
      }).appendTo($interaction);
      instance = H5P.newRunnable(action, contentId, $inner);

      // Trigger event listeners
      self.trigger('display', $interaction);

      // Resize on next tick
      setTimeout(function () {
        instance.$.trigger('resize');
      }, 0);
    };

    /**
     * Checks to see if the interaction should pause the video.
     *
     * @public
     * @returns {Boolean}
     */
    self.pause = function () {
      return parameters.pause;
    };

    /**
     * Check to see if interaction should be displayed as button.
     *
     * @public
     * @returns {Boolean}
     */
    self.isButton = function () {
      return parameters.displayAsButton === undefined || parameters.displayAsButton || library === 'H5P.Nil';
    };

    /**
     * Create dot for displaying above the video timeline.
     * Append to given container.
     *
     * @public
     * @param {jQuery} $container
     */
    self.addDot = function ($container) {
      if (library === 'H5P.Nil') {
        return; // Skip "sub titles"
      }

      // One could also set width using ((parameters.duration.to - parameters.duration.from + 1) * oneSecondInPercentage)
      $('<div/>', {
        'class': 'h5p-seekbar-interaction ' + classes,
        title: title,
        css: {
          left: (parameters.duration.from * oneSecondInPercentage) + '%'
        }
      }).appendTo($container);
    };

    /**
     * Display or remove the interaction depending on the video time.
     *
     * @public
     * @param {Number} second video time
     * @returns {jQuery} interaction button or container
     */
    self.toggle = function (second) {
      if (second < parameters.duration.from || second > parameters.duration.to) {
        if ($interaction) {
          // Remove interaction from display
          self.remove();
        }
        return;
      }

      if ($interaction) {
        return; // Interaction already on display
      }

      if (self.isButton()) {
        createButton();
      }
      else {
        createPoster();
      }

      return $interaction;
    };

    /**
     * Position label to the left or right of the action button.
     *
     * @public
     * @param {Number} width Size of the container
     */
    self.positionLabel = function (width) {
      if (!self.isButton() || !$label) {
        return;
      }

      $label.removeClass('h5p-left-label');
      if (parseInt($interaction.css('left')) + $label.position().left + $label.outerWidth() > width) {
        $label.addClass('h5p-left-label');
      }
    };

    /**
     * Update element position.
     *
     * @public
     * @param {Number} x left
     * @param {Number} y top
     */
    self.setPosition = function (x, y) {
      parameters.x = x;
      parameters.y = y;
    };

    /**
     * Update element size.
     *
     * @public
     * @param {Number} width in ems
     * @param {Number} height in ems
     */
    self.setSize = function (width, height) {
      parameters.width = width;
      parameters.height = height;

      if (library === 'H5P.DragQuestion') {
        // Re-create element to set new size
        self.remove(true);
        self.toggle(parameters.from);
      }

      instance.$.trigger('resize');
    };

    /**
     * Removes interaction from display.
     *
     * @public
     * @param {Boolean} [updateSize] Used when re-creating element
     */
    self.remove = function (updateSize) {
      if ($interaction) {
        if (updateSize && library === 'H5P.DragQuestion') {
          // Update size
          var size = action.params.question.settings.size;
          var fontSize = Number($interaction.css('fontSize').replace('px', ''));
          if (self.isButton()) {
            // Update element size with drag question parameters
            parameters.width = size.width / fontSize;
            parameters.height = size.height / fontSize;
          }
          else {
            // Update drag question parameters with size set on element
            size.width = Math.round(parameters.width * fontSize);
            size.height = Math.round(parameters.height * fontSize);
          }
        }

        $interaction.remove();
        $interaction = undefined;
      }
    };

    /**
     * Collect copyright information for the interaction.
     *
     * @public
     * @returns {H5P.ContentCopyrights}
     */
    self.getCopyrights = function () {
      var instance = H5P.newRunnable(action, contentId);

      if (instance !== undefined && instance.getCopyrights !== undefined) {
        var interactionCopyrights = instance.getCopyrights();
        if (interactionCopyrights !== undefined) {
          interactionCopyrights.setLabel(title + ' ' + humanizeTime(parameters.duration.from) + ' - ' + humanizeTime(parameters.duration.to));
          return interactionCopyrights;
        }
      }
    };
  }

  // Extends the event dispatcher
  Interaction.prototype = Object.create(EventDispatcher.prototype);
  Interaction.prototype.constructor = Interaction;

  // Tool for converting
  var $converter = $('<div/>');

  return Interaction;
})(H5P.jQuery, H5P.EventDispatcher);
