
        // DOM elements
        const newMatchTextarea = document.getElementById('newMatchData');
        const addMatchBtn = document.getElementById('addMatchBtn');
        const clearAllBtn = document.getElementById('clearAllBtn');
        const matchesList = document.getElementById('matchesList');
        const statusMessage = document.getElementById('statusMessage');
        const predictBtn = document.getElementById('predictBtn');
        const teamSelectDiv = document.getElementById('teamSelect');
        const team1Select = document.getElementById('team1Select');
        const team2Select = document.getElementById('team2Select');
        const resultsDiv = document.getElementById('results');
        const predictionOutput = document.getElementById('predictionOutput');
        const shiftSlider = document.getElementById('shiftSlider');
        const shiftValue = document.querySelector('.shift-value');
        
        let matches = [];
        let teamStats = {};
        const MAX_MATCHES = 10;
        
        shiftSlider.addEventListener('input', function() {
            shiftValue.textContent = `Recent weight: ${this.value}%`;
        });
        
        // Add new match (FIFO system)
        addMatchBtn.addEventListener('click', function() {
            const inputText = newMatchTextarea.value.trim();
            if (!inputText) {
                showStatus('Please enter match data', 'warning');
                return;
            }
            
            const lines = inputText.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length < 4) {
                showStatus('Need 4 lines of data (Team1, Score1, Score2, Team2)', 'warning');
                return;
            }
            
            const team1 = lines[0];
            const score1 = parseInt(lines[1]);
            const score2 = parseInt(lines[2]);
            const team2 = lines[3];
            
            if (isNaN(score1)) {
                showStatus(`Invalid score for ${team1}: ${lines[1]}`, 'warning');
                return;
            }
            if (isNaN(score2)) {
                showStatus(`Invalid score for ${team2}: ${lines[2]}`, 'warning');
                return;
            }
            
            // Add new match to beginning of array (most recent first)
            matches.unshift({
                team1,
                team2,
                score1,
                score2,
                timestamp: new Date()
            });
            
            // Remove oldest match if we exceed max
            if (matches.length > MAX_MATCHES) {
                const removed = matches.pop();
                showStatus(`Added new match. Discarded oldest: ${removed.team1} ${removed.score1}-${removed.score2} ${removed.team2}`, 'info');
            } else {
                showStatus(`Added new match: ${team1} ${score1}-${score2} ${team2}`, 'info');
            }
            
            newMatchTextarea.value = '';
            
            // Update UI
            updateMatchesList();
            updateTeamSelects();
        });
        
        // Clear all matches
        clearAllBtn.addEventListener('click', function() {
            matches = [];
            teamStats = {};
            updateMatchesList();
            updateTeamSelects();
            showStatus('All matches cleared', 'info');
            teamSelectDiv.style.display = 'none';
            resultsDiv.style.display = 'none';
        });
        
        // Make prediction
        predictBtn.addEventListener('click', function() {
            if (matches.length < 3) {
                showStatus('Need at least 3 matches to make prediction', 'warning');
                return;
            }
            
            analyzeTeams();
            
            if (team1Select.options.length < 2 || team2Select.options.length < 2) {
                showStatus('Not enough teams to predict (need at least 2)', 'warning');
                return;
            }
            
            teamSelectDiv.style.display = 'block';
            
            // Auto-select first two teams if none selected
            if (!team1Select.value && !team2Select.value) {
                team1Select.value = team1Select.options[1].value;
                team2Select.value = team2Select.options[2]?.value || team2Select.options[1].value;
            }
            
            // If teams are selected, show prediction immediately
            if (team1Select.value && team2Select.value && team1Select.value !== team2Select.value) {
                makePrediction();
            }
        });
        
        // Team selection change
        team1Select.addEventListener('change', function() {
            if (this.value && team2Select.value && this.value !== team2Select.value) {
                makePrediction();
            }
        });
        
        team2Select.addEventListener('change', function() {
            if (this.value && team1Select.value && this.value !== team1Select.value) {
                makePrediction();
            }
        });
        
        // Helper functions
        function showStatus(message, type) {
            statusMessage.textContent = message;
            statusMessage.className = `status-message ${type}`;
            statusMessage.style.display = 'block';
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 5000);
        }
        
        function updateMatchesList() {
            matchesList.innerHTML = '';
            
            if (matches.length === 0) {
                matchesList.innerHTML = '<p>No matches entered yet</p>';
                return;
            }
            
            matches.forEach((match, index) => {
                const matchDiv = document.createElement('div');
                matchDiv.className = 'match-entry';
                matchDiv.innerHTML = `
                    <span>#${matches.length - index}: ${match.team1} ${match.score1}-${match.score2} ${match.team2}</span>
                    <span>${match.timestamp.toLocaleString()}</span>
                `;
                matchesList.appendChild(matchDiv);
            });
            
            document.getElementById('predictBtn').disabled = matches.length < 3;
        }
        
        function updateTeamSelects() {
            const allTeams = [...new Set(matches.flatMap(m => [m.team1, m.team2]))];
            
            team1Select.innerHTML = '';
            team2Select.innerHTML = '';
            
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a team';
            team1Select.appendChild(defaultOption.cloneNode(true));
            team2Select.appendChild(defaultOption.cloneNode(true));
            
            allTeams.sort().forEach(team => {
                const option1 = document.createElement('option');
                option1.value = team;
                option1.textContent = team;
                team1Select.appendChild(option1);
                
                const option2 = document.createElement('option');
                option2.value = team;
                option2.textContent = team;
                team2Select.appendChild(option2);
            });
        }
        
        function analyzeTeams() {
            teamStats = {};
            const shiftWeight = parseInt(shiftSlider.value) / 100;
            
            // Get all unique teams
            const allTeams = [...new Set(matches.flatMap(m => [m.team1, m.team2]))];
            
            // Initialize team stats
            allTeams.forEach(team => {
                teamStats[team] = {
                    goalsFor: [],
                    goalsAgainst: [],
                    attackStrength: 0,
                    defenseWeakness: 0,
                    matches: 0,
                    cleanSheets: 0,
                    failedToScore: 0
                };
            });
            
            // Calculate with shift weighting
            matches.forEach((match, idx) => {
                const weight = 1 + (shiftWeight * (matches.length - idx - 1));
                
                // Team 1 stats
                teamStats[match.team1].goalsFor.push({value: match.score1, weight});
                teamStats[match.team1].goalsAgainst.push({value: match.score2, weight});
                teamStats[match.team1].matches += weight;
                if (match.score1 === 0) teamStats[match.team1].failedToScore += weight;
                if (match.score2 === 0) teamStats[match.team1].cleanSheets += weight;
                
                // Team 2 stats
                teamStats[match.team2].goalsFor.push({value: match.score2, weight});
                teamStats[match.team2].goalsAgainst.push({value: match.score1, weight});
                teamStats[match.team2].matches += weight;
                if (match.score2 === 0) teamStats[match.team2].failedToScore += weight;
                if (match.score1 === 0) teamStats[match.team2].cleanSheets += weight;
            });
            
            // Calculate weighted averages and percentages
            allTeams.forEach(team => {
                const stats = teamStats[team];
                const totalWeight = stats.goalsFor.reduce((sum, item) => sum + item.weight, 0);
                
                if (totalWeight > 0) {
                    stats.attackStrength = stats.goalsFor.reduce((sum, item) => sum + (item.value * item.weight), 0) / totalWeight;
                    stats.defenseWeakness = stats.goalsAgainst.reduce((sum, item) => sum + (item.value * item.weight), 0) / totalWeight;
                    stats.cleanSheets = stats.cleanSheets / stats.matches;
                    stats.failedToScore = stats.failedToScore / stats.matches;
                }
                
                stats.ggPercentage = 1 - (stats.cleanSheets * stats.failedToScore);
                stats.avgGoals = (stats.attackStrength + stats.defenseWeakness) / 2;
            });
        }
        
        function makePrediction() {
            const team1 = team1Select.value;
            const team2 = team2Select.value;
            
            if (!teamStats[team1] || !teamStats[team2]) {
                showStatus('Error analyzing team data', 'warning');
                return;
            }
            
            const stats1 = teamStats[team1];
            const stats2 = teamStats[team2];
            
            // Basic prediction (simplified Poisson)
            const homeAttack = (stats1.attackStrength + stats2.defenseWeakness) / 2;
            const awayAttack = (stats2.attackStrength + stats1.defenseWeakness) / 2;
            
            // Adjust for virtual match randomness
            const randomnessFactor = 0.7 + Math.random() * 0.6;
            const predScore1 = Math.max(0, Math.round(homeAttack * randomnessFactor));
            const predScore2 = Math.max(0, Math.round(awayAttack * randomnessFactor));
            
            // GG probability
            const ggProb = 1 - ((stats1.failedToScore + stats2.failedToScore) / 2);
            
            // Over 1.5 probability
            const over15Prob = 0.5 + ((stats1.avgGoals + stats2.avgGoals) / 4);
            
            // Win probabilities
            const winProb1 = 0.3 + (homeAttack - awayAttack) * 0.2;
            const winProb2 = 0.3 + (awayAttack - homeAttack) * 0.2;
            const drawProb = 0.4 - Math.abs(homeAttack - awayAttack) * 0.2;
            
            // Normalize probabilities to sum to 1
            const totalProb = winProb1 + winProb2 + drawProb;
            const normalizedWinProb1 = winProb1 / totalProb;
            const normalizedWinProb2 = winProb2 / totalProb;
            const normalizedDrawProb = drawProb / totalProb;
            
            // Correct score probabilities
            const scoreProbabilities = [];
            const baseScores = [
                [predScore1, predScore2],
                [predScore1 + 1, predScore2],
                [predScore1, predScore2 + 1],
                [predScore1 - (predScore1 > 0 ? 1 : 0), predScore2],
                [predScore1, predScore2 - (predScore2 > 0 ? 1 : 0)],
                [1, 1],
                [1, 0],
                [0, 1],
                [2, 1],
                [1, 2]
            ];
            const uniqueScores = Array.from(new Set(baseScores.map(JSON.stringify))).map(JSON.parse)
                .filter(([a, b]) => a >= 0 && b >= 0);
            uniqueScores.sort((a, b) => {
                const diffA = Math.abs(a[0] - predScore1) + Math.abs(a[1] - predScore2);
                const diffB = Math.abs(b[0] - predScore1) + Math.abs(b[1] - predScore2);
                return diffA - diffB;
            });
            const topScores = uniqueScores.slice(0, 5);
            predictionOutput.innerHTML = `
                <div class="prediction-card">
                    <h3>${team1} vs ${team2}</h3>
                    <div class="team-stats">
                        <div class="team-stat">
                            <h4>${team1}</h4>
                            <p>Attack: ${stats1.attackStrength.toFixed(2)}</p>
                            <p>Defense: ${stats1.defenseWeakness.toFixed(2)}</p>
                            <p>Clean sheets: ${(stats1.cleanSheets * 100).toFixed(1)}%</p>
                        </div>
                        <div class="team-stat">
                            <h4>${team2}</h4>
                            <p>Attack: ${stats2.attackStrength.toFixed(2)}</p>
                            <p>Defense: ${stats2.defenseWeakness.toFixed(2)}</p>
                            <p>Clean sheets: ${(stats2.cleanSheets * 100).toFixed(1)}%</p>
                        </div>
                    </div>
                    <h4>Most likely winner: ${predScore1 > predScore2 ? team1 : predScore2 > predScore1 ? team2 : 'Draw'}</h4>
                    <div class="prob-bar">
                        <div class="prob-fill" style="width: ${normalizedWinProb1 * 100}%">
                            ${team1}: ${(normalizedWinProb1 * 100).toFixed(1)}%
                        </div>
                    </div>
                    <div class="prob-bar">
                        <div class="prob-fill" style="width: ${normalizedDrawProb * 100}%">
                            Draw: ${(normalizedDrawProb * 100).toFixed(1)}%
                        </div>
                    </div>
                    <div class="prob-bar">
                        <div class="prob-fill" style="width: ${normalizedWinProb2 * 100}%">
                            ${team2}: ${(normalizedWinProb2 * 100).toFixed(1)}%
                        </div>
                    </div>
                    <h4>Both teams to score (GG): ${(ggProb * 100).toFixed(1)}%</h4>
                    <div class="prob-bar">
                        <div class="prob-fill" style="width: ${ggProb * 100}%"></div>
                    </div>
                    <h4>Over 1.5 goals: ${(over15Prob * 100).toFixed(1)}%</h4>
                    <div class="prob-bar">
                        <div class="prob-fill" style="width: ${over15Prob * 100}%"></div>
                    </div>
                    <h4>Most likely scores:</h4>
                    <ol>
                        ${topScores.map(score => `<li>${score.join('-')}</li>`).join('')}
                    </ol>
                    <h4>Predicted score: ${predScore1}-${predScore2}</h4>
                </div>
                <h3>Recent Matches Analysis</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Match</th>
                            <th>Score</th>
                            <th>GG</th>
                            <th>Over 1.5</th>
                        </tr>
                    </thead>
                    <tbody>
                     ${matches
                            .filter(m => m.team1 === team1 || m.team2 === team1 || m.team1 === team2 || m.team2 === team2)
                            .slice(0, 5)
                            .map(match => {
                                const isTeam1Home = match.team1 === team1 || match.team1 === team2;
                                const homeTeam = isTeam1Home ? match.team1 : match.team2;
                                const awayTeam = isTeam1Home ? match.team2 : match.team1;
                                const homeScore = isTeam1Home ? match.score1 : match.score2;
                                const awayScore = isTeam1Home ? match.score2 : match.score1;
                                const gg = homeScore > 0 && awayScore > 0 ? 'Yes' : 'No';
                                const over15 = homeScore + awayScore > 1.5 ? 'Yes' : 'No';
                                return `
                                    <tr>
                                        <td>${homeTeam} vs ${awayTeam}</td>
                                        <td>${homeScore}-${awayScore}</td>
                                        <td>${gg}</td>
                                        <td>${over15}</td>
                                    </tr>
                                `;
                            })
                            .join('')}
                    </tbody>
                </table>
            `;
            resultsDiv.style.display = 'block';
        }
        
        updateMatchesList();
                      
