### Browser support
IE 10+ (possibly 9 also), latest of Chrome/FF/Safari, iOS 7+ and Android 2.3+ (except 3.x)

### Quick steps to use:

#### Load files

``` html
<!-- 1) Load jQuery -->
<script src="https://code.jquery.com/jquery-1.11.3.min.js"></script>

<!-- 2) Load egjs packaged file -->
<script src="http://naver.github.io/egjs/latest/dist/pkgd/eg.pkgd.min.js"></script>
```

#### Bind scrollEnd event

``` javascript
$(window).on("scrollend", function(e, info){
  info.top; // The scroll top position.
  info.left; // The scroll left position.
});
```