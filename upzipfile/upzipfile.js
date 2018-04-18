(function (obj) {
    zip.workerScriptsPath = "/zip/lib/";

    var requestFileSystem = obj.webkitRequestFileSystem || obj.mozRequestFileSystem || obj.requestFileSystem;

    function onerror(message) {
        alert(message);
    }

    function createTempFile(callback) {
        var tmpFilename = "tmp.dat";
        requestFileSystem(TEMPORARY, 4 * 1024 * 1024 * 1024, function (filesystem) {
            // console.log(filesystem)

            function create() {
                filesystem.root.getFile(tmpFilename, {
                    create: true
                }, function (zipFile) {
                    callback(zipFile);
                });
            }

            filesystem.root.getFile(tmpFilename, null, function (entry) {
                entry.remove(create, create);
            }, create);
        });
    }

    var model = (function () {
        var URL = obj.webkitURL || obj.mozURL || obj.URL;

        return {
            getEntries: function (file, onend) {
                zip.createReader(new zip.BlobReader(file), function (zipReader) {
                    zipReader.getEntries(onend);
                }, onerror);
            },
            getEntryFile: function (entry, creationMethod, onend, onprogress) {
                var writer, zipFileEntry;

                function getData() {
                    entry.getData(writer, function (blob) {
                        var blobURL = creationMethod == "Blob" ? URL.createObjectURL(blob) : zipFileEntry.toURL();
                        onend(blobURL);
                    }, onprogress);
                }

                if (creationMethod == "Blob") {
                    writer = new zip.BlobWriter();
                    getData();
                } else {
                    createTempFile(function (fileEntry) {
                        zipFileEntry = fileEntry;
                        writer = new zip.FileWriter(zipFileEntry);
                        getData();
                    });
                }
            }
        };
    })();

    (function () {
        var fileInput = document.getElementById("file-input");
        var unzipProgress = document.createElement("progress");
        var fileList = document.getElementById("file-list");
        var creationMethodInput = document.getElementById("creation-method-input");

        function download(entry, li, a) {
            model.getEntryFile(entry, creationMethodInput.value, function (blobURL) {
                var clickEvent = document.createEvent("MouseEvent");
                if (unzipProgress.parentNode) {
                    unzipProgress.parentNode.removeChild(unzipProgress);
                }
                unzipProgress.value = 0;
                unzipProgress.max = 0;
                clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                a.href = blobURL;
                // console.log(blobURL)
                a.download = entry.filename;
                a.dispatchEvent(clickEvent);
            }, function (current, total) {
                unzipProgress.value = current;
                unzipProgress.max = total;
                li.appendChild(unzipProgress);
            });
        }

        if (typeof requestFileSystem == "undefined") {
            creationMethodInput.options.length = 1;
        }

        fileInput.addEventListener('change', function () {
            fileInput.disabled = true;
            model.getEntries(fileInput.files[0], function (entries) {
                fileList.innerHTML = "";
                entries.forEach(function (entry, index) {
                    var type = entry.filename.split('.')[1]
                    var imgType = 'jpg,jpeg,png,git,bmp';
                    var audioType = 'mp3,ogg,m4a'
                    var li = document.createElement("li");
                    var a = document.createElement("a");
                    a.textContent = entry.filename;
                    a.href = "#";
                    a.addEventListener("click", function (event) {
                        if (!a.download) {
                            download(entry, li, a);
                            event.preventDefault();
                            return false;
                        }
                    }, false);

                    if (type == 'json' || type == 'c3proj') {
                        entry.getData(new zip.TextWriter(), function (text) {
                        }, function (current, total) {
                            // onprogress callback
                        }).then(function (text) {
                            console.log(JSON.parse(text))
                        });
                    } else if (imgType.indexOf(type) > -1) {
                        var img = document.createElement('img')
                        entry.getData(new zip.BlobWriter(), function (blob) {
                            var url = window.URL.createObjectURL(blob)
                            img.src = url
                            img.width = 100
                            img.height = 100
                            // console.log(url)
                            li.appendChild(img);
                        });
                    } else if (audioType.indexOf(type) > -1) {
                        var audio = document.createElement('audio')
                        entry.getData(new zip.BlobWriter(), function (blob) {
                            var url = window.URL.createObjectURL(blob)
                            audio.src = url
                            audio.setAttribute('controls', true)
                            // console.log(url)
                            li.appendChild(audio);
                        });
                    }
                    // console.log("==================" + index + "======================")
                    li.appendChild(a);
                    fileList.appendChild(li);
                });
            });
        }, false);
    })();

})(this);