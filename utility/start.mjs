import { input } from '@inquirer/prompts'
import { select } from '@inquirer/prompts'
import { CallStorage } from './storage.mjs'
import { interface_creator } from './interface.mjs'
import { keyBuild } from './key_builder.mjs'
import { ErrorType } from './error.mjs'
import { openBrownser } from './explorerManipulation.mjs'
import { testDevMode } from '../sys/devMode/devmode.mjs'
import * as fs from 'fs'

var localData = null
var serverData = null
var members = []
var Temporarymember = null
var answer = null

var AllRevivableActiveID = []
var AllRevivableActiveName = []
var OnlyInHospitalID = []
var OnlyInHospitalName = []

var loop = true
var loopElapsed = 0;
var a = 0;
var b = 0;

var invalid = false

function defaultValues() {
	localData = null
	serverData = null
	members = []
	Temporarymember = null
	answer = null

	AllRevivableActiveID = []
	AllRevivableActiveName = []
	OnlyInHospitalID = []
	OnlyInHospitalName = []

	loop = true
	loopElapsed = 0;
	a = 0;
	b = 0;
}
export async function start() {
	await defaultValues()
	await pullLocal()
	if(testDevMode() !== false) {localData.key = testDevMode()}

	if(localData.permissions.awaysTest == true) {
		serverData = await keyBuild(localData.key, 'key', '/info', 'testKey')
		if(serverData.access_level >= 1) {
			console.log('> key tested')
			console.log('> starting')
		}
		await keyBuild(localData.key, 'key', '/info', 'testKey') // ERROR HERE : need a verify process
	}
	while(loop == true) {
		if(loopElapsed == 0) {
			interface_creator()	
			if(invalid == true) {
				console.log('\x1b[31m')
				console.log('> invalid ID')
				reset_color()
				invalid = false
			}
			answer = await input({message: 'input the faction ID: '})
		}
		else {interface_creator()}
		loop = localData.permissions.autoUpdate // get the default permission from JSON
		serverData = await keyBuild(localData.key, 'faction', answer, 'getFactionUsers')
		try {members = await Object.keys(serverData.members)} catch {invalid = true}
		if(invalid == false) {
			interface_creator()
			console.log('\x1b[33m')
			console.log('> loading id: ','\x1b[36m', JSON.stringify(serverData.ID))
			console.log('\x1b[33m')
			console.log(`> The faction: ${serverData.name} have: ${Object.keys(serverData.members).length} members`)
			reset_color()
			for(var i = 0; i<members.length; i++) {
				Temporarymember = await keyBuild(localData.key, 'user', members[i], 'profile')
				if(Temporarymember.revivable == 1) {
					AllRevivableActiveID[a] = Temporarymember.player_id
					AllRevivableActiveName[a] = Temporarymember.name
					a++
					if(Temporarymember.revivable == 1 && Temporarymember.status.color == 'red') {
						OnlyInHospitalID[b] = Temporarymember.player_id
						OnlyInHospitalName[b] = Temporarymember.name
						b++
					}
				}
			}
			loopElapsed++
			if(localData.permissions.printNames == true){printNames()}
			else {
				console.log('> Results done')
				console.log('\x1b[0m')
				console.log(`> ${AllRevivableActiveID.length} in Force Mode and ${OnlyInHospitalID.length} in hospital : Updates Elapsed: ${loopElapsed}`)
				reset_color()
			}
			a = 0; b= 0;
			if(await optionManage(await optionPrint()) == 'disableLoop') {loop = false}
		}
	}
}

async function pullLocal() {
	if(await CallStorage(0) == -1) {await ErrorType('E1')}
	localData = await CallStorage('pull')
	return localData = JSON.parse(localData)
}

function printNames() {
	console.log('\x1b[0m')
	console.log(`> ${AllRevivableActiveID.length} revivable players (ignorig hospital state) and in hospital ${OnlyInHospitalID.length}`)
	reset_color()
	console.log(`> printing all`)
	console.log('\x1b[33m')
	for(var i = 0; i<AllRevivableActiveName.length; i++) {console.log(`> ${AllRevivableActiveName[i]}`)}
	reset_color()
	console.log('> printing only in hospital')
	console.log('\x1b[33m')
	for(var i = 0; i<OnlyInHospitalName.length; i++) {console.log(`> ${OnlyInHospitalName[i]}`)}
	reset_color()
}

async function optionManage(value) {
	switch(value) {
		case 0:
			return 'disableLoop'
		break;
		case 1:
			openBrownser(AllRevivableActiveID)
		break;
		case 2:
			await openBrownser(OnlyInHospitalID)
		break;
		default:
			console.error('\x1b[31m','Error - Menu_selection, invalid input'); reset_color()
	}
}
async function optionPrint() {
	var updateDescriptionForcedMode = 'disabled in permissions'
	var HospitalInisponibility = null
	if(localData.permissions.autoUpdate == false) {updateDescriptionForcedMode = 'not optimized, dont use in big factions (Can mine memory by opening multiple tabs in chrome)'}
	if(OnlyInHospitalID.length == 0) {HospitalInisponibility = true}
	else {HospitalInisponibility = false}
	return select({message: 'Useful Options', choices: [
		{name: 'Force Mode', value: 1, description: updateDescriptionForcedMode, disabled: localData.permissions.protectionMode},
		{name: 'Restricted mode',value: 2, description: 'open Only in hospital targets', disabled: HospitalInisponibility },
		{name: 'back',value: 0, description: 'close the medBay spies'}
	]})
}

function reset_color() {return console.log('\x1b[0m')}