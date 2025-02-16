{::nomarkdown}
<div id="content">
<h2>3rd Party Addon Versions</h2>
<p>Currently only includes Emmotes and imp444 and Pneumatus' repos:</p>
<br>
</div>
<script type="module">
import { Octokit } from "https://esm.sh/@octokit/core";

const v=1;
const octokit=new Octokit({ auth: `` });
const repos = {
	"Emmotes": {
		"name": "Emmote",
		"repo": "IC_Addons",
		"path": "/IC_Addons"
	},
	"imp444": {
		"name": "ImpEGamer",
		"repo": "IC_Addons",
		"path": ""
	},
	"Pneumatus": {
		"name": "Ismo",
		"repo": "IC-Addons",
		"path": ""
	}
};
const baseUrl = {
	"pre": "https://raw.githubusercontent.com/",
	"mid": "/refs/heads/main/",
	"suf": "/Addon.json"
}

async function init() {
	let ele = document.getElementById(`content`);
	let names = ``;
	let first = true;
	for (let owner in repos) {
		if (first)
			first = true;
		else
			names += ` / `;
		names += repos[owner].name;
	}
	let prefix = `<h2>3rd Party Addon Versions</h2><p>Currently only includes the repos belonging to ${names}</p><br>`;
	let c = `<table><tr><th>Owner</th><th>Addon</th><th>Version</th></tr>`;
	try {
		for (let owner in repos) {
			let repo = repos[owner];
			let repoStructures = await getFileList(owner,repo.repo,repo.path);
			if (repoStructures.status!=200)
				continue;
			for (let repoStructure of repoStructures.data) {
				if (repoStructure.type!="dir")
					continue;
				let addonUrl=`${baseUrl.pre}${owner}/${repo.repo}${baseUrl.mid}${repoStructure.path}${baseUrl.suf}`;
				let addon = await getVersion(addonUrl);
				c += `<tr><td>${repo.name}</td><td>${addon.Name}</td><td>${addon.Version}</td></tr>`;
				ele.innerHTML = prefix + c + `</table>`;
			}
		}
		ele.innerHTML = prefix + c + `</table><p>Done.</p>`;
	} catch {
		ele.innerHTML = prefix + `<p>Something went wrong.</p>`;
	}
}

async function getFileList(owner,repo,path) {
	return await octokit.request('GET /repos/{owner}/{repo}/contents{path}', {
		owner: owner,
		repo: repo,
		path: path,
		headers: {
			'X-GitHub-Api-Version': '2022-11-28'
		}
	});
}

async function getVersion(url) {
	var response = await fetch(url)
		.then(response => response.text());
	return await JSON.parse(response);
}

await init();
</script>
{:/nomarkdown}