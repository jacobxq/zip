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
            var num = 0;
            var globalObj = {}
            var project = {}
            model.getEntries(fileInput.files[0], function (entries) {
                fileList.innerHTML = "";
                entries.forEach(function (entry, index) {
                    var type = entry.filename.split('.')
                    type = type[type.length - 1]
                    var imgType = 'jpg,jpeg,png,git,bmp';
                    var audioType = 'mp3,ogg,m4a,mp4'
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

                    function end() {
                        num = num + 1
                        if (num >= entries.length) {
                            console.log('end')
                            handleData()
                        }
                    }

                    function handleData() {
                        project = globalObj['project.c3proj'] || globalObj['project.json']
                        project.objectTypes = handleObjectTypes(project.objectTypes)
                        project.containers = handleContainers(project.containers)
                        project.families = handleFamilies(project.families)
                        project.layouts = handleLayouts(project.layouts)
                        project.eventSheets = handleEventSheets(project.eventSheets)
                        project.rootFileFolders = handleRootFileFolders(project.rootFileFolders)
                        // console.log(JSON.stringify(project, null, 2))
                        localforage.setItem('project', project).then(function(project) {
                            console.log(project);
                        }).catch(function(err) {
                            console.log(err);
                        });
                    }

                    function handleObjectTypes(objectTypes) {
                        var items = []
                        objectTypes.items.forEach(function (item, index) {
                            var path = 'objectTypes\\' + item.toLowerCase() + '.json'
                            items[index] = handleImage(globalObj[path])
                        })
                        objectTypes.subfolders.forEach(function (sbuItem) {
                            handleObjectTypes(sbuItem)
                        })
                        objectTypes.items = items
                        return objectTypes
                    }

                    function handleContainers(containers) {
                        var items = []
                        containers.forEach(function (container, containerIndex) {
                            var arr = []
                            container.members.forEach(function (item, index) {
                                var path = 'objectTypes\\' + item.toLowerCase() + '.json'
                                arr[index] = handleImage(globalObj[path])
                            })
                            container.members = arr
                            items[containerIndex] = container
                        })
                        
                        containers = items
                        return containers
                    }

                    function handleFamilies(families) {
                        var items = []
                        families.items.forEach(function (item, index) {
                            var path = 'families\\' + item.toLowerCase() + '.json'
                            items[index] = handleFamilyObj(globalObj[path])
                        })
                        families.subfolders.forEach(function (subItem) {
                            handleFamilies(subItem)
                        })
                        families.items = items
                        return families
                    }

                    function handleFamilyObj(obj) {
                        var items = []
                        console.log(obj)
                        obj.members.forEach(function (item, index) {
                            var path = 'objectTypes\\' + item.toLowerCase() + '.json'
                            items[index] = handleImage(globalObj[path])
                        })
                        obj.members = items
                        return obj
                    }

                    function handleLayouts(layouts) {
                        var items = []
                        layouts.items.forEach(function (item, index) {
                            var path = 'layouts\\' + item.toLowerCase() + '.json'
                            items[index] = globalObj[path]
                        })
                        layouts.subfolders.forEach(function (subItem) {
                            handleLayouts(subItem)
                        })
                        layouts.items = items
                        return layouts
                    }

                    function handleEventSheets(eventSheets) {
                        var items = []
                        eventSheets.items.forEach(function (item, index) {
                            var path = 'eventSheets\\' + item.toLowerCase() + '.json'
                            items[index] = globalObj[path]
                        })
                        eventSheets.subfolders.forEach(function (subItem) {
                            handleEventSheets(subItem)
                        })
                        eventSheets.items = items
                        return eventSheets
                    }

                    function handleRootFileFolders(rootFileFolders) {
                        for (var fileName in rootFileFolders) {
                            var items = []
                            rootFileFolders[fileName].items.forEach(function (item, index) {
                                var pathFolder = (fileName == 'icon' || fileName == 'sound') ? fileName + 's' : fileName
                                var path = pathFolder + '\\' + item.name.toLowerCase()
                                item.blob = globalObj[path]
                                item.path = path
                                items[index] = item
                            })
                            rootFileFolders[fileName].subfolders.forEach(function (subItem) {
                                handleRootFileFolders(subItem)
                            })
                            rootFileFolders[fileName].items = items
                        }
                        return rootFileFolders
                    }

                    function handleImage(obj) {
                        var name = obj.name
                        var animations = []
                        // console.log(obj.image, obj.animations)
                        if (obj.image) {
                            var imagePath = 'images\\' + obj.name.toLowerCase() + '.' + obj.image.exportFormat
                            obj.image.blob = globalObj[imagePath]
                            obj.image.path = imagePath
                        }
                        if (obj.animations) {
                            obj.animations = handleAnimationImage(name, obj.animations)
                        }
                        // console.log(obj)
                        return obj
                    }

                    function handleAnimationImage(name, types) {
                        var items = []
                        types.items.forEach(function (item, index) {
                            var arr = []
                            item.frames.forEach(function (imgItem, indexItem) {
                                var imagePath = 'images\\' + name.toLowerCase() + '-' + item.name.toLowerCase() + '-' + fixZero(indexItem) +'.' + imgItem.exportFormat
                                imgItem.blob = globalObj[imagePath]
                                imgItem.path = imagePath
                                arr[indexItem] = imgItem
                            })
                            item.frames = arr
                            items[index] = item
                        })
                        types.subfolders.forEach(function (sbuItem) {
                            handleAnimationImage(name, sbuItem)
                        })
                        types.items = items
                        return types
                    }

                    function fixZero(num) {
                        if (num <= 9) {
                            num = '00' + num
                        } else if (num > 9 && num < 99) {
                            num = '0' + num
                        }
                        return num
                    }

                    if (type == 'json' || type == 'c3proj') {
                        entry.getData(new zip.TextWriter(), function (text) {
                            var obj = JSON.parse(text)
                            globalObj[entry.filename] = obj
                            end()
                        }, function (current, total) {
                            // onprogress callback
                        });
                    } else if (imgType.indexOf(type) > -1) {
                        var img = document.createElement('img')
                        entry.getData(new zip.BlobWriter(), function (blob) {
                            var url = window.URL.createObjectURL(blob)
                            globalObj[entry.filename] = blob
                            img.src = url
                            img.width = 100
                            img.height = 100
                            // console.log(url)
                            li.appendChild(img);
                            end()
                        });
                    } else if (audioType.indexOf(type) > -1) {
                        var audio = document.createElement('audio')
                        entry.getData(new zip.BlobWriter(), function (blob) {
                            var url = window.URL.createObjectURL(blob)
                            globalObj[entry.filename] = blob
                            audio.src = url
                            audio.setAttribute('controls', true)
                            // console.log(url)
                            li.appendChild(audio);
                            end()
                        });
                    } else {
                        end()
                    }
                    // console.log("==================" + index + "======================")
                    li.appendChild(a);
                    fileList.appendChild(li);
                });
            });
        }, false);
    })();

})(this);