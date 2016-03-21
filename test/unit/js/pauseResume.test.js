/**
* Copyright (c) 2015 NAVER Corp.
* egjs projects are licensed under the MIT license
*/

// jscs:disable
// to resolve transform style value
QUnit.config.reorder = false;

var hooks = {
	beforeEach: function() {
		this.$el = $("#box1");
	},
	afterEach: function() {
		this.$el.css({"left": 0});
	}
};

module("Initialization", hooks);
test("pause", function(assert) {
	var done = assert.async();

	// Given
	var destLeft = 200;
	var duration = 1000;
	var prevLeft;
	this.$el.animate({"left": destLeft}, duration, "linear");

	// When
	setTimeout($.proxy(function() {
		this.$el.stop();

		prevLeft = parseFloat(this.$el.css("left"));
	}, this), duration / 2);

	//Then
	setTimeout($.proxy(function() {
		equal(prevLeft, parseFloat(this.$el.css("left")), "It is not moved after paused.");
		//if status is paused, fx-queue will be "inprogress".
		this.$el.stop();
		done();
	}, this), duration);
});

test("resume", function(assert) {
	var done = assert.async();

	// Given
	var destLeft = 200;
	var duration = 400;
	var pauseAfter = duration / 2;
	var pauseDuration = duration / 2;
	this.$el.animate({"left": destLeft}, duration);

	// When
	setTimeout($.proxy(function() {
		this.$el.pause();
	}, this), pauseAfter);

	setTimeout($.proxy(function() {
		this.$el.resume();
	}, this), pauseDuration);

	//Then
	setTimeout($.proxy(function() {
		equal(parseFloat(this.$el.css("left")), destLeft, "The box is moved to destination after resumed.");
		done();
	}, this), duration + pauseDuration);
});

test("chaining", function(assert) {
	var done = assert.async();

	// Given
	var destLeft = [200, 400, 600];
	var duration = 300;
	var totalDuration = duration * 3;
	var pauseAfter = 100;
	var pauseDuration = 100;

	this.$el
		.animate({"left": destLeft[0]}, duration)
		.animate({"left": destLeft[1]}, duration)
		.animate({"left": destLeft[2]}, duration)

	// When
	setTimeout($.proxy(function() {
		this.$el.pause();
	}, this), pauseAfter);

	setTimeout($.proxy(function() {
		this.$el.resume();
	}, this), pauseDuration);

	//Then
	setTimeout($.proxy(function() {
		equal(parseFloat(this.$el.css("left")), destLeft[2], "The box is moved to destination after resumed.");
		done();
	}, this), totalDuration + pauseDuration);
});

test("relative values", function(assert) {
	var done = assert.async();

	// Given
	var destLeft = ["+=100", "+=100", "+=100"];
	var duration = 300;
	var totalDuration = duration * 3;
	var pauseAfter = 100;
	var pauseDuration = 100;

	this.$el
		.animate({"left": destLeft[0]}, duration)
		.animate({"left": destLeft[1]}, duration)
		.animate({"left": destLeft[2]}, duration)

	// When
	setTimeout($.proxy(function() {
		this.$el.pause();
		setTimeout($.proxy(function() {
			this.$el.resume();
		}, this), pauseDuration);
	}, this), pauseAfter);

	//Then
	setTimeout($.proxy(function() {
		equal(parseFloat(this.$el.css("left")), 300, "The box is moved to destination after resumed.");
		done();
	}, this), totalDuration + pauseAfter + pauseDuration);
});

test("external css style and relative value test", function(assert) {
	var done = assert.async();
	var pauseAfter = 100;
	var pauseDuration = 10;

	// Given
	// Check if 'before value' is obtained well when applied relative value.
	this.$el
		.removeAttr("style")
		.removeClass("box")
		.addClass("otherStyleBox")
		.animate({"left": "+=100px"}) //'.otherStyleBox' style defines initial value of 'left' as 50px, so this animate must make 150px left.
		.animate({"width": "+=100px", "height": "+=50px"}) // width and height is first 

	// When
	setTimeout($.proxy(function() {
		this.$el.pause();

		setTimeout($.proxy(function() {
			this.$el.resume();
		}, this), pauseDuration);
	}, this), pauseAfter);

	//Then
	setTimeout($.proxy(function() {
		equal(parseInt(this.$el.css("left")), 150, "Relative movements on CSS styled element is resumed correctly.");
		equal(parseInt(this.$el.css("width")), 100, "Relative sizing width on CSS styled element is resumed correctly.");
		equal(parseInt(this.$el.css("height")), 100, "Relative sizing height on CSS styled element is resumed correctly.")
		
		this.$el.removeClass("otherStyleBox").addClass("box");
		done();
	}, this), 1000);
});

test("paused filter test", function(assert) {
	var done = assert.async();
	var duration = 1000;
	var pauseAfter = duration / 2;
	var pauseDuration = 10;
	var margin = 100;
	var pauseCount1 = 0;
	var pauseCount2 = 0;

	// Given
	this.$el
		.animate({"left": "100px"}, duration)

	// When
	setTimeout($.proxy(function() {
		this.$el.pause();

		pauseCount1 = $("#box1:paused").length;

		setTimeout($.proxy(function() {
			this.$el.resume();

			pauseCount2 = $("#box1:paused").length;
		}, this), pauseDuration);
	}, this), pauseAfter);

	//Then
	setTimeout($.proxy(function() {
		equal(pauseCount1, 1, "Getting paused element by paused filter. Must be 1");
		equal(pauseCount2, 0, "Getting resumed element by paused filter. Must be none");

		done();
	}, this), duration + pauseDuration + margin);
});
