// Just some random math functions... 

// Source: https://github.com/stdlib-js/random-base-gamma/blob/main/lib/gamma.js
/**
* Returns a pseudorandom number drawn from a gamma distribution.
*
* @private
* @param {PRNG} randu - PRNG for uniformly distributed numbers
* @param {PRNG} randn - PRNG for standard normally distributed numbers
* @param {PositiveNumber} beta - rate parameter
* @param {PositiveNumber} d - `alpha + 2/3` or `alpha - 1/3`
* @param {PositiveNumber} c - `1.0 / sqrt( 9.0*d )`
* @returns {PositiveNumber} pseudorandom number
*/
gamma_helper = function( beta, d, c ) {
	var flg;
	var x2;
	var v0;
	var v1;
	var x;
	var u;
	var v;

	flg = true;
	while ( flg ) {
		do {
			x = normal(0, 1);
			v = 1.0 + (c*x);
		} while ( v <= 0.0 );
		v *= v * v;
		x2 = x * x;
		v0 = 1.0 - (0.331*x2*x2);
		v1 = (0.5*x2) + (d*( 1.0-v+Math.log(v) ));
		u = Math.random();
		if ( u < v0 || Math.log( u ) < v1 ) {
			flg = false;
		}
	}
	return (1.0/beta) * d * v;
};

gamma = function(alpha, beta) {
    var d;
    var c;
    if (alpha >= 1.0) {
        d = alpha - 1/3;
        c = 1.0/Math.sqrt(9*d);
        // gamma1a
        return gamma_helper(beta, d, c);
    } else {
        d = alpha + 2/3;
        c = 1.0/Math.sqrt(9*d);
        // gamma1b
        return gamma_helper(beta, d, c)*Math.pow(Math.random(), 1/alpha);
    }
};

/*
 * Samples from a normal distribution.
 * */
normal = function(mu, sigma) {
    // normal distribution using the Box-Muller transform
    var p1 = 2*Math.PI*Math.random();
    var R = Math.sqrt(-2*Math.log(Math.random()));
    var rand1 = R*Math.cos(p1);
    var rand2 = R*Math.sin(p1);
    var x1 = sigma*rand1 + mu;
    return x1;
};

/*
 * Samples from a Dirichlet distribution.
 * Based on https://stats.stackexchange.com/questions/69210/drawing-from-dirichlet-distribution, https://en.wikipedia.org/wiki/Dirichlet_distribution#From_gamma_distribution
 * */
dirichlet = function(alpha) {
    var sample = new Array(alpha.length);
    var i;
    var k;
    var g;
    var sample_sum = 0;
    for (i = 0; i < alpha.length; i++) {
        k = alpha[i];
        g = gamma(k, 1);
        sample[i] = g;
        sample_sum += g;
    }
    for (i = 0; i < sample.length; i++) {
        sample[i] = sample[i]/sample_sum;
    }
    return sample;
};

// https://stackoverflow.com/questions/46622486/what-is-the-javascript-equivalent-of-numpy-argsort
argsort = function(x) {
   return x.map((item, index) => [item, index]).sort().map(x => x[1]); 
};

// election simulation algorithms for 2-round elections
// All parties outside the top 2 pick the top 2 party that it is closest to, and move all its votes to that party.
top2_winner = function(district, inter_party_relations) {
    var rankings = argsort(district).reverse();
    var top2 = rankings.slice(0, 2);
    var top2_votes = [district[top2[0]], district[top2[1]]];
    var top2_rankings = [inter_party_relations[top2[0]], inter_party_relations[top2[1]]];
    var party;
    for (var i = 2; i < rankings.length; i++) {
        party = rankings[i];
        if (top2_rankings[0][party] >= top2_rankings[1][party]) {
            top2_votes[0] += district[party];
        } else {
            top2_votes[1] += district[party];
        }
    }
    if (top2_votes[0] >= top2_votes[1]) {
        return top2[0];
    } else {
        return top2[1];
    }
};

// top 3 in first round advance, second round has other parties allocate votes to most preferred party in top 3.
top3_winner = function(district, inter_party_relations) {
    var rankings = argsort(district).reverse();
    var top3 = rankings.slice(0, 3);
    var top3_votes = [district[top3[0]], district[top3[1]], district[top3[2]]];
    var top3_rankings = [inter_party_relations[top3[0]], inter_party_relations[top3[1]],
    inter_party_relations[top3[2]]];
    var party;
    for (var i = 3; i < rankings.length; i++) {
        party = rankings[i];
        if (top3_rankings[0][party] >= top3_rankings[1][party] && top3_rankings[0][party] >= top3_rankings[2][party]) {
            top3_votes[0] += district[party];
        } else if (top3_rankings[1][party] >= top3_rankings[0][party] && top3_rankings[1][party] >= top3_rankings[2][party]) {
            top3_votes[1] += district[party];
        }
        else {
            top3_votes[2] += district[party];
        }
    }
    if (top3_votes[0] >= top3_votes[1] && top3_votes[0] >= top3_votes[2]) {
        return top3[0];
    } else if (top3_votes[1] >= top3_votes[0] && top3_votes[1] >= top3_votes[2]) {
        return top3[1];
    } else {
        return top3[2];
    }
};

/*
 * simulates n districts and returns an array with the total number of districts voting for each party, given that the national popular vote is votes.
 * */
simulate_districts = function(votes, inter_party_relations, n_districts, dirichlet_scale) {
    if (!dirichlet_scale) {
        dirichlet_scale = 0.05;
    }
    var votes_scaled = votes.map((x) => dirichlet_scale*x);
    var district_results = new Array(votes.length);
    var i;
    for (i = 0; i < district_results.length; i++) {
        district_results[i] = 0;
    }
    var sample;
    var winner;
    for (i = 0; i < n_districts; i++) {
        sample = dirichlet(votes_scaled);
        winner = top3_winner(sample, inter_party_relations);
        district_results[winner] += 1;
    }
    return district_results;
};
