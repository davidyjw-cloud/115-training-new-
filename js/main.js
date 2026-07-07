/* ============================================
   共用 JavaScript（升級版）
   1. 手機版選單開關
   2. 課程頁：自動載入照片（容忍多種檔名寫法）
      可辨識：01.jpg / 1.jpg / 01.jpg.jpg / 01. jpg /
              大小寫 JPG、JPEG、PNG 等
   3. 燈箱（點照片放大、左右切換）
   4. 講義 PDF 偵測（handout.pdf / handout.pdf.pdf）
   ============================================ */

// ---------- 1. 手機版選單 ----------
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', links.classList.contains('open') ? 'true' : 'false');
    });
  }

  // ---------- 2. 照片自動載入 ----------
  var gallery = document.querySelector('.gallery');
  if (gallery) {
    var courseId = gallery.dataset.course; // 例如 "course1"
    var maxPhotos = 20;
    var found = 0;
    var pending = 0;
    var emptyMsg = document.querySelector('.gallery-empty');

    // 為每個編號產生所有可能的檔名寫法
    function candidatesFor(n) {
      var pad = (n < 10 ? '0' + n : '' + n); // 01
      var raw = '' + n;                       // 1
      var names = pad === raw ? [pad] : [pad, raw];
      var exts = ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG',
                  'jpg.jpg', 'JPG.jpg', 'jpeg.jpg', 'png.png',
                  ' jpg', '. jpg'];
      var list = [];
      for (var i = 0; i < names.length; i++) {
        for (var e = 0; e < exts.length; e++) {
          var ext = exts[e];
          if (ext === '. jpg') {
            list.push(names[i] + '. jpg');      // 「01. jpg」點後有空格
          } else if (ext === ' jpg') {
            list.push(names[i] + ' .jpg');      // 「01 .jpg」點前有空格
          } else {
            list.push(names[i] + '.' + ext);
          }
        }
      }
      return list;
    }

    function tryPhoto(n) {
      var list = candidatesFor(n);
      tryNext(n, list, 0);
    }

    function tryNext(n, list, idx) {
      if (idx >= list.length) { checkDone(); return; }
      var src = '../photos/' + courseId + '/' + encodeURIComponent(list[idx]);
      var img = new Image();
      pending++;
      img.onload = function () {
        pending--;
        addPhoto(src, n);
        checkDone();
      };
      img.onerror = function () {
        pending--;
        tryNext(n, list, idx + 1);
      };
      img.src = src;
    }

    function addPhoto(src, n) {
      found++;
      var a = document.createElement('a');
      a.href = src;
      a.dataset.order = n;
      a.setAttribute('aria-label', '課程照片 ' + n);
      var img = document.createElement('img');
      img.src = src;
      img.alt = '課程照片 ' + n;
      img.loading = 'lazy';
      a.appendChild(img);
      // 依編號插入正確位置，維持順序
      var inserted = false;
      var children = gallery.querySelectorAll('a');
      for (var i = 0; i < children.length; i++) {
        if (parseInt(children[i].dataset.order, 10) > n) {
          gallery.insertBefore(a, children[i]);
          inserted = true;
          break;
        }
      }
      if (!inserted) gallery.appendChild(a);
      a.addEventListener('click', onPhotoClick);
    }

    function checkDone() {
      if (pending === 0 && emptyMsg) {
        emptyMsg.style.display = found === 0 ? 'block' : 'none';
      }
    }

    for (var n = 1; n <= maxPhotos; n++) tryPhoto(n);

    // ---------- 3. 燈箱 ----------
    var lightbox = document.querySelector('.lightbox');
    var lightboxImg = lightbox ? lightbox.querySelector('img') : null;
    var currentIndex = 0;

    function photoLinks() {
      return Array.prototype.slice.call(gallery.querySelectorAll('a'));
    }

    function openLightbox(index) {
      var linksArr = photoLinks();
      if (!linksArr.length || !lightbox) return;
      currentIndex = (index + linksArr.length) % linksArr.length;
      lightboxImg.src = linksArr[currentIndex].href;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }

    function onPhotoClick(e) {
      e.preventDefault();
      openLightbox(photoLinks().indexOf(e.currentTarget));
    }

    if (lightbox) {
      lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
      lightbox.querySelector('.lightbox-prev').addEventListener('click', function () { openLightbox(currentIndex - 1); });
      lightbox.querySelector('.lightbox-next').addEventListener('click', function () { openLightbox(currentIndex + 1); });
      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) closeLightbox();
      });
      document.addEventListener('keydown', function (e) {
        if (!lightbox.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') openLightbox(currentIndex - 1);
        if (e.key === 'ArrowRight') openLightbox(currentIndex + 1);
      });
    }
  }

  // ---------- 4. 講義 PDF 偵測 ----------
  var handout = document.querySelector('.handout-box');
  if (handout) {
    var btn = handout.querySelector('.btn');
    var missing = handout.querySelector('.handout-missing');
    if (btn) {
      var base = btn.getAttribute('href'); // ../files/courseN/handout.pdf
      var pdfCandidates = [base, base + '.pdf']; // 容忍 handout.pdf.pdf

      function tryPdf(idx) {
        if (idx >= pdfCandidates.length) return;
        fetch(pdfCandidates[idx], { method: 'HEAD' })
          .then(function (res) {
            if (res.ok) {
              btn.setAttribute('href', pdfCandidates[idx]);
              btn.style.display = 'inline-block';
              if (missing) missing.style.display = 'none';
            } else {
              tryPdf(idx + 1);
            }
          })
          .catch(function () { tryPdf(idx + 1); });
      }
      tryPdf(0);
    }
  }
});
