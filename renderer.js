$(() => {
    if (document.prefixFilters === 'undefined') document.prefixFilters = [];
    printPrefixFilters();

    function printPrefixFilters() {
        const filtersDisplay = $('#filtersDisplay');
        filtersDisplay.html('');
        for (let i in document.prefixFilters) {
            filtersDisplay.append('<a href="#" class="badge badge-secondary" on-click="deleteFilter(this)">' + document.prefixFilters[i] + '</a>');
        }
    }

    $("#filtersDisplay").on("click", "a.badge", function () {
        document.prefixFilters.splice(document.prefixFilters.indexOf($(this).html()), 1);
        printPrefixFilters();
        return false;
    });

    $('#filtersForm').submit(() => {
        $('#addFilter').attr('disabled', true);
        const filter = $('#filter').val().toUpperCase();
        if (filter.match(/^[A-Z]+$/) && !document.prefixFilters.includes(filter)) {
            document.prefixFilters.push(filter);
            printPrefixFilters();
            $('#filter').val('');
        }
        $('#addFilter').removeAttr('disabled');
        return false;
    });




    const statusColorMap = {
        "Open": "#EEE",
        "In Progress": "#8EF",
        "Blocked": "#FF0",
        "Completed": "#5FA",
        "In Test": "#FA0",
    };

    const linkTypesColours = {
        Dependency: '#00F',
        Blocks: '#F00',
        Relates: '#0F0',
        Clones: '#AAA',
    };

    function isMatchingTheFilter(tag) {
        const tagRegex = /([A-Za-z]+)-([0-9]+)/;
        const matches = tagRegex.exec(tag);
        if (matches) {
            return document.prefixFilters.includes(matches[1]);
        } else {
            console.error(tag);
            return false;
        }
    }

    function plantUMLEscape(str) {
        return str.replace(/[- ]/g, "_");
    }

    function asyncWhile(condition, body) {
        function loop(loopResolve, loopReject) {
            if (condition()) {
                new Promise(body)
                    .then(() => loop(loopResolve, loopReject))
                    .catch((err) => loopReject(err));
            } else {
                loopResolve();
            }
        }
        return new Promise(loop);
    }

    $('#generate').click(() => {
        $('#generate').attr('disabled', true);
        const username = $('#username').val();
        const password = $('#password').val();
        const host = $('#host').val() + '/rest/api/2';
        const initialIssue = $('#initialIssue').val();
        const linkTypesEnabled = {
            Dependency: $('#Dependency').is(":checked"),
            Blocks: $('#Blocks').is(":checked"),
            Relates: $('#Relates').is(":checked"),
            Clones: $('#Clones').is(":checked"),
        };

        let issuesToProcess = [initialIssue];
        let issuesProcessed = [];
        let umlHeader = 'left to right direction\n';
        let umlBody = '';

        asyncWhile(() => issuesToProcess.length > 0, (resolve, reject) => {
            const issue = issuesToProcess.pop();
            issuesProcessed.push(issue);
            console.log(issue);

            $.ajax({
                    url: host + '/issue/' + issue,
                    method: 'GET',
                    headers: {
                        "Authorization": "Basic " + btoa(username + ":" + password)
                    },
                })
                .done(function (body) {
                    const color = body.fields.status.name in statusColorMap ? statusColorMap[body.fields.status.name] : '#FFF';
                    umlHeader += 'class "' + issue + '" as ' + plantUMLEscape(issue) + ' ' + color + ' {\n'
                    umlHeader += '  {field} ' + body.fields.summary + '\n';
                    umlHeader += '  {method} Status: ' + body.fields.status.name + '\n';
                    umlHeader += '  {method} Reporter: ' + body.fields.reporter.displayName + '\n';
                    umlHeader += '}\n\n';

                    if (isMatchingTheFilter(issue)) {
                        for (const i in body.fields.issuelinks) {
                            const link = body.fields.issuelinks[i];
                            // console.log(link)
                            const type = link.type.name;
                            let outwardDirection = link.hasOwnProperty('outwardIssue');
                            const key = outwardDirection ? link.outwardIssue.key : link.inwardIssue.key;
                            // console.log(key, issuesProcessed);
                            if (!(issuesProcessed.includes(key))) {
                                if (linkTypesEnabled[type]) {
                                    if (type === 'Blocks') {
                                        outwardDirection = !outwardDirection
                                    }
                                    let color = linkTypesColours[type];
                                    if (outwardDirection) {
                                        umlBody += plantUMLEscape(key) + ' -[' + color + ']down-> ' + plantUMLEscape(issue) + ' : ' + type + '\n';
                                    } else {
                                        umlBody += plantUMLEscape(issue) + ' -[' + color + ']down-> ' + plantUMLEscape(key) + ' : ' + type + '\n';
                                    }

                                    if (!(issuesToProcess.includes(key))) {
                                        issuesToProcess.push(key);
                                    }
                                }
                            }
                        }
                    }
                    resolve();
                })
                .fail(function (err) {
                    console.error('[ajax]:', err);
                    $('#status').html('Error: [' + err.status + '] ' + err.statusText);
                    reject(err);
                });

            // console.log('Remaining issues to process:', issuesToProcess.length);
            $('#status').html('Processed: ' + issuesProcessed.length + '  Remaining: ' + issuesToProcess.length);
        }).then(() => {
            $('#diagramSource').val('@startuml\n' + umlHeader + '\n' + umlBody + '\n@enduml');
            $('#status').html('Generating Diagram');
            generatePlantUMLLink();
            $('#status').html('Done');
            $('#generate').removeAttr('disabled');
        }).catch((err) => {
            console.error('[asyncWhile]:', err);
            $('#generate').removeAttr('disabled');
        });
    });

    function generatePlantUMLLink() {
        let plantumlServer = 'http://www.plantuml.com/plantuml';
        if (!$('#publicServer').is(":checked")) {
            plantumlServer = $('#platnumlServer').val();
        }
        const encodedDiagram = window.plantumlEncoder.encode($('#diagramSource').val());
        $('#diagram').attr('src', plantumlServer + '/svg/' + encodedDiagram);
    }
});