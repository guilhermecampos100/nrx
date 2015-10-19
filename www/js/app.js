var app = {
    initialize: function() {
        this.bindEvents();
    },
   
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        
    },

    onDeviceReady: function() {
        app.receivedEvent('deviceready');
		ons.setDefaultDeviceBackButtonListener(function() {
            if (navigator.notification.confirm("Are you sure to close the app?", 
                function(index) {
                    if (index == 1) { // OK button
                        navigator.app.exitApp(); // Close the app
                    }
                }
            ));
        });

 
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        console.log('Received Event: ' + id);
    },
  
};


(function() {
    var app = angular.module('sensationApp', ['onsen.directives', 'ngTouch', 'ngSanitize']);

    app.config(['$httpProvider', function($httpProvider) {

        $httpProvider.defaults.headers.common['Cache-Control'] = 'no-cache';
        $httpProvider.defaults.cache = false;

    }]);
 
	  // Login: Login Controller  **********************************
	  // ***********************************************************
	app.controller('loginController', function($scope, $rootScope, $http, transformRequestAsFormPost) {

		$scope.fazerLogin = function(login, senha) {
			window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, fail);
			
			if(checkLogin(login, senha)) {
				entrachecklists();
			}
		}
		
	   function gotFS(fileSystem) {
		   
		}

		function fail(evt) {
			alert(JSON.stringify(evt));
		}
	
		
		function entrachecklists() {
			$scope.MeuNavigator.pushPage('escolhechecklist.html', {secaoPai: {}, animation: 'slide'});	
		}
	

		function checkLogin(login, senha) {
			
			var urljson = 'http://gnrx.com.br/loginJson.asp';
			$http({method: 'POST',
				   url: urljson,
				   transformRequest: transformRequestAsFormPost,
						data: {
							login: login,
							senha: senha
						}
					}).
			success(function(data, status, headers, config) {
				if (data.nome != '' ) {
					localStorage.setItem('login', login);
					localStorage.setItem('senha', senha);
					localStorage.setItem('nomeusuario', data.nome);
					entrachecklists();
					return true;
				}
				else {
					alert('usuário/senha incorretos'); 
					return false;
				}
			}).
			error(function(data, status, headers, config) {
				alert('erro no json ' +  data);
				if (localStorage.getItem('login') != undefined) {
					entrachecklists();
					return true;
				}
				
				return false;
			});	
		};
	});
	
	 
	  // EscolheChecklist Controller  **********************************
	  // ***********************************************************
	app.controller('EscolheChecklistController', function($scope, $rootScope, $http, $filter) {
		
		$scope.token = $rootScope.tokenGlobal
		var page = MeuNavigator.getCurrentPage();
		$scope.secaoPai = page.options.secaoPai;
		if ($rootScope.chkoffline == undefined) 
			$rootScope.chkoffline = true;
		
		if ($scope.secaoPai == undefined || $scope.secaoPai.codigo == undefined) {
			$scope.secaoPai =  {};
			$scope.secaoPai.codigo = '';
		}

		
		$scope.temchecklistlocal = false;
		$scope.temchecklistservidor = false;
		
		//var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
				
		$scope.classelista = function(tipo) {
			if (tipo == "secao")
				return 'item lista_amarela ng-scope list__item ons-list-item-inner list__item--chevron';
			else
				return 'item item ng-scope list__item ons-list-item-inner list__item--chevron';
		}

		$scope.checklists = [];
		
		atualizaOffline();
		// PREENCHE ENTIDADE CHECKLISTS COM OS JA BAIXADOS PARA O APP
		function atualizaOffline () {
			$scope.checklists = [];
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_gui (token text, codigo text, descricao text, secaopai text, tipo text, conforme text, obs text, latitude text, longitude text,datalimite text, entidade int, ordenacao text, codigooriginal text, atualizouservidor int, imagemanexa text)');
				tx.executeSql("Select * from checklist_gui cg where codigo not like '%.%'", [], function(tx, results) {
						if (results.rows.length > 0) {$scope.temchecklistlocal = true; }
						for (var i=0; i < results.rows.length; i++){
							row = results.rows.item(i);
							var item = {"codigo":row.codigo,"descricao": row.descricao, "token": row.token, "importado": true, "datalimite": row.datalimite}
							$scope.checklists.push(item);
						}
						
						atualizaOnline();
						
						$scope.$apply();
					}
				);
			});
		}
		
		
		// VERIFICA OS CHECKLIST NO SERVIDOR DISPONIVEIS PARA DOWNLOAD
		function atualizaOnline() {
			var urljson = 'http://gnrx.com.br/secoes.asp?acao=escolhechecklist&hora=' + Date.now();
			$http({method: 'GET', url: urljson}).
			success(function(data, status, headers, config) {
				for (var i=0; i < data.secoes.length; i++){
							var item = {"codigo":data.secoes[i].codigo,"descricao": data.secoes[i].descricao, "token": data.secoes[i].token, "importado": false,  "datalimite": data.secoes[i].datalimite}
							//var result = $.grep($scope.checklists, function(e){ return e.token == data.secoes[i].token; });
							
							var found = $filter('filter')($scope.checklists, {token: data.secoes[i].token}, true);
							if (found.length == 0) {
								$scope.checklists.push(item);
								$scope.temchecklistservidor = true;
							// so insere um registro novo se ele ainda nao foi baixado
							}
				}
				$scope.$apply();

			}).
			error(function(data, status, headers, config) {
				alert('erro json ' +  status.message);
			});	
		};
		

		
		// NAVEGA PARA SECOES
		$scope.entrasecoes = function(token, nome) {
			$rootScope.tokenGlobal = token;
			$scope.MeuNavigator.pushPage('secoes.html', {secaoPai: {}, secaoAvo: {}, nomechecklist: nome, animation: 'slide'});	
		}

		
		// NAVEGA PA SECOES E ITENS
		$scope.showDetail = function(index) {
			var secaoPai = $scope.secoes[index];
			var secaoAvo = $scope.secaoPai
			if (secaoPai.tipo == 'secao')
				$scope.MeuNavigator.pushPage('secoes.html', {secaoPai: secaoPai, secaoAvo: secaoAvo, animation: 'slide'});
			else
				$scope.MeuNavigator.pushPage('itens.html', {secaoPai: secaoPai, secaoAvo: secaoAvo, animation: 'slide'});
		}
			 
		$scope.VoltaTopo = function(index) {
			$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'})
		}
		
		
		// NAVEGA PARA IMPORTACHEKCLIST
		$scope.importaChecklist = function(token, nome) {
			$rootScope.tokenGlobal = token;
			$scope.MeuNavigator.pushPage('importachecklist.html',{secaoPai: $rootScope.secaoPai, nomechecklist: nome, animation: 'slide'})
		}
		
		
	});
	
	
    // SECOES Controller ****************************************
	// **********************************************************
    app.controller('SecoesController', ['$q', '$interval', '$timeout', '$location', '$anchorScroll', '$scope', '$compile', '$rootScope', '$http', 'SecoesData', function($q, $interval, $timeout, $location, $anchorScroll, $scope, $compile, $rootScope, $http, SecoesData) {
		$scope.token = $rootScope.tokenGlobal
		var page = MeuNavigator.getCurrentPage();
		$scope.secaoPai = page.options.secaoPai;
		$scope.secaoAvo = page.options.secaoAvo;
		if (page.options.nomechecklist != undefined)
			$rootScope.nomechecklist = page.options.nomechecklist;
		
		if (page.options.posicao != undefined) {
			//alert("chegou a posicao" + page.options.posicao);
			// $location.hash(page.options.posicao);
  			// $anchorScroll();
		}
		
		$scope.scrollfim = function() {
			 $timeout(function() {
				$location.hash("fim");
				$anchorScroll();
			});
		};
		
		if ($rootScope.chkoffline == undefined) 
			$rootScope.chkoffline = true;
		
		if ($scope.secaoPai == undefined || $scope.secaoPai.codigo == undefined) {
			$scope.secaoPai =  {};
			$scope.secaoPai.codigo = '';
		}
		
		var entidade = 0;
		
		$scope.abrepagina = function(File_Name) {
				var fotoURL = fs.root.nativeURL + "/anexo/" + File_Name;
				window.open(fotoURL, '_blank', 'location=yes', 'EnableViewPortScale=yes');	
		}
		
		if ($scope.secaoPai.entidade != undefined && $scope.secaoPai.entidade != '') {
			entidade = $scope.secaoPai.entidade;
		}
		
		ons.createPopover('popover.html',{parentScope: $scope}).then(function(popover) {
			$scope.popover = popover;
		});

		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
				var PERSISTENT
		if (typeof LocalFileSystem === 'undefined') {
			PERSISTENT = window.PERSISTENT;
		} else {
			PERSISTENT = LocalFileSystem.PERSISTENT ;
		}
		
		var fs;
		window.requestFileSystem(PERSISTENT, 0, 
			function(fileSystem) {
				fs = fileSystem;
				$scope.caminhofoto = fs.root.nativeURL;
			}
			, deuerro);
		
		var deuerro = function(error) {
			alert("Erro código: " + error.code);
			$scope.obtendo_gps = false;
			$scope.$apply();	
		};	
				
		$scope.classelista = function(tipo, entidade) {
			if (tipo == "secao")
				if (entidade != undefined && entidade > 0) 
					return 'item lista_verde ng-scope list__item ons-list-item-inner list__item--chevron';
				else
					return 'item lista_amarela ng-scope list__item ons-list-item-inner list__item--chevron';
			else
				return 'item item ng-scope list__item ons-list-item-inner list__item--chevron';
		}
			
		$scope.tem_foto = function(codigo) {
			db.transaction(function(tx) {
				tx.executeSql("Select count(*) as quantasfotos from checklist_fotos where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.token, $scope.secaoPai.codigo, entidade], function(tx, results) {
					if (results.rows.item(0).quantasfotos > 0)
						return true;
					else
						return false;
				});
			});
		}

		$scope.tem_obs = function(codigo) {
			db.transaction(function(tx) {
				tx.executeSql("Select obs from checklist_gui where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.token, $scope.secaoPai.codigo, entidade], function(tx, results) {
					if (results.rows.item(0).obs != undefined && results.rows.item(0).obs != '')
						return true;
					else
						return false;
				});
			});
		}
		
		$scope.tem_gps = function(codigo) {
			db.transaction(function(tx) {
				tx.executeSql("Select latitude from checklist_gui where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.token, $scope.secaoPai.codigo, entidade], function(tx, results) {
					if (results.rows.item(0).latitude != undefined && results.rows.item(0).latitude != '')
						return true;
					else
						return false;
				});
			});
		}
		
		$scope.items = [];
		
		$scope.coricone = function(conforme) {
					if (conforme == undefined || conforme == '')
						return 'black';
					else if (conforme == 'sim')
						return 'green';
					else if (conforme == 'nao')
						return 'red';		
					else if (conforme == 'nao se aplica')
						return 'blue';
		}
		
		$scope.icone = function(conforme) {
					if (conforme == undefined || conforme == '')
						return 'fa-question'; 
					else if (conforme == 'sim')
						return 'fa-check-square-o';
					else if (conforme == 'nao')
						return 'fa-warning';	
					else if (conforme == 'nao se aplica')
						return 'fa-minus';						
		}

		// ACAO DO PULL-HOOK
		  $scope.load = function($done) {
			$timeout(function() {
			  atualizaoffline();
			  $done();
			}, 1000);
		  };  

		// CARREGA SECOES 
		function atualizaoffline () {
			$scope.secoes = [];
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_gui (token text, codigo text, descricao text, secaopai text, tipo text, conforme text, obs text, latitude text, longitude text,datalimite text, entidade int, ordenacao text, codigooriginal text, atualizouservidor int, imagemanexa text)');
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_fotos (token text, codigo text, nome text, obs text, entidade int, atualizouservidor int)');

				tx.executeSql("Select *, (select count(*) from checklist_fotos where codigo = cg.codigo and token = cg.token and ifnull(entidade,0) = ifnull(cg.entidade,0)) as qtd_fotos, (select nome from checklist_fotos where codigo = cg.codigo and token = cg.token and ifnull(entidade,0) = ifnull(cg.entidade,0) limit 1) as fotosecao, (select count(*) from checklist_gui where token=cg.token and tipo='item' and codigo like cg.codigo || '.%' ) as totalitens, (select sum(case when conforme is not null then 1 else 0 end) totalrespondidos from checklist_gui where token = cg.token and tipo='item' and codigo like cg.codigo || '.%') as respondidos from checklist_gui cg where cg.token=? and cg.secaopai=? order by ordenacao, entidade", [$scope.token, $scope.secaoPai.codigo], function(tx, results) {
						for (var i=0; i < results.rows.length; i++){
							row = results.rows.item(i);
							row.descricaocomglossario = row.descricao.replace("<(glo", "<a id=linkglossario class=linkglo ng-click=showglossario($event,");
							$scope.secoes.push(row);
						}
						$scope.$apply();
					}, function(a, b) {
						 alert(b.message);
					}		
				);
			});
		}
	
		$scope.showglossario = function(e, codglo) {
			db.transaction(function(tx) {
				tx.executeSql("Select * from glossario where codigo=?", [codglo], function(tx, results) {
					$scope.termoglossario = results.rows.item(0).termo;
					$scope.descricaoglossario = results.rows.item(0).descricao;
				})
			})
			$scope.popover.show(e.target);
		};	
		
		$scope.showDetail = function(index) {
			 if( (!angular.element(event.target).hasClass('linkglo')) && (event.target.id != 'imagemanexa') ){
				/* not the <a> entao redireciona, se nao nao faz isso para poder respeitar o link do glossário */

				var secaoPai = $scope.secoes[index];
				var secaoAvo = $scope.secaoPai
				if (secaoPai.tipo == 'secao')
					$scope.MeuNavigator.pushPage('secoes.html', {secaoPai: secaoPai, secaoAvo: secaoAvo, animation: 'slide'});
				else {
					$rootScope.tevealteracaoitem = false;
					$scope.MeuNavigator.pushPage('itens.html', {secaoPai: secaoPai, secaoAvo: secaoAvo, animation: 'slide'});
				}
			 }
		};
			 
		$scope.VoltaTopo = function(index) {
			$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: {}, animation: 'slide'})
		}
				
		$scope.PaginaConfig = function() {

			$scope.MeuNavigator.pushPage('config.html',{secaoPai: $scope.secaoPai, secaoAvo: $scope.secaoAvo, animation: 'slide'})
			
		}
		
		atualizaoffline();	

}]);

	// ImportaChecklist  Controller *********************************************************
	// *******************************************************************************
    app.controller('ImportaController', function($scope, $rootScope, $http, transformRequestAsFormPost ) {
		$scope.token = $rootScope.tokenGlobal
		var checklist_secoes = [];
		var glossario = [];
		$scope.conta_atualizando = 0;
		var page = MeuNavigator.getCurrentPage();
		$scope.nomechecklist = page.options.nomechecklist;
		$scope.atualizando = false;
		$scope.total_itens = 0;
		
		var fs;
		window.requestFileSystem(PERSISTENT, 0, function(fileSystem) {
			fs = fileSystem;
			var directoryEntry = fs.root; // to get root path of directory
			directoryEntry.getDirectory('anexos', { create: true, exclusive: false }, onDirectorySuccess, onDirectoryFail); // creating folder in sdcard
		}
		, fail);
		
		function onDirectorySuccess(parent) {
			// Directory created successfuly
			//alert("diretorio criado: " + parent.name);
		}

		function onDirectoryFail(error) {
			//Error while creating directory
			alert("Unable to create new directory: " + error.code);
		}	

		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);

		$scope.AtualizaBanco = function() {
			puxaglossario();
			puxabanco();
		}
	
		$scope.VoltaTopo = function(index) {
			$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'});

		}
		
		function puxabanco() {
			$scope.atualizando = true;
			var urljson = 'http://gnrx.com.br/secoes.asp?token=' + $scope.token + '&pai=99999&hora=' + Date.now();
			$http({method: 'GET', url: urljson}).
			success(function(data, status, headers, config) {
				checklist_secoes = data.secoes;
				criabanco();
			}).
			error(function(data, status, headers, config) {
				alert('erro no json ' +  data);
				$scope.atualizando = false;
			});	
		};
		
	
		function puxaglossario() {
			$scope.atualizando = true;
			var urljson = 'http://gnrx.com.br/puxaglossario.asp?hora=' + Date.now();
			$http({method: 'GET', url: urljson}).
			success(function(data, status, headers, config) {
				glossario = data.glossario;
				criabancoGlossario();
			}).
			error(function(data, status, headers, config) {
				alert('erro no json ' +  data);
				$scope.atualizando = false;
			});	
		};

		function criabancoGlossario() {
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS glossario (codigo int, termo text, descricao text)');
				$scope.total_itens_glossario = glossario.length;
				var cont = 0;
				for (var i=0;i < glossario.length; i++) {
					var entidade = glossario[i].entidade
					var sql = "INSERT INTO glossario (codigo, termo, descricao) VALUES ('"+glossario[i].codigo+"','"+glossario[i].termo+"','"+glossario[i].descricao+"')";
					tx.executeSql(sql,[], function(tx, res) {
						$scope.conta_atualizando_glossario = cont;
						cont++;
						if (cont == glossario.length - 1) {
							$scope.atualizandoglossario = false;
							alert('glossario atualizado ' + glossario.length + ' termos ');
							//$scope.MeuNavigator.pushPage('escolhechecklist.html', {secaoPai: [], animation: 'slide'});	
						}
						$scope.$apply();
					}, function(dados, erro) {
						console.log(JSON.stringify(erro.message));
					});
				}
			});	
		};

		
		function filetransfer(download_link, fp) {
			var fileTransfer = new FileTransfer();
			// File download function with URL and local path
			fileTransfer.download(download_link, fp,
					function (entry) {
						//alert("download complete: " + entry.fullPath);
					},
				 function (error) {
					 //Download abort errors or download failed errors
					// alert("download error source " + error.source);
				 }
			);
		}		

		
		function criabanco() {
			//db = window.openDatabase({name: "my.db"});

			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_gui (token text, codigo text, descricao text, secaopai text, tipo text, conforme text, obs text, latitude text, longitude text,datalimite text, entidade int, ordenacao text, codigooriginal text, atualizouservidor int, imagemanexa text)');
				tx.executeSql("DELETE from checklist_gui where token = ?", [$rootScope.tokenGlobal], function(tx, resultado) {
					$scope.total_itens = checklist_secoes.length;
					var cont = 0;
					for (var i=0;i < checklist_secoes.length; i++) {
						var entidade = checklist_secoes[i].entidade
						if (entidade == '') { entidade = null; }
						if (checklist_secoes[i].anexo != undefined && checklist_secoes[i].anexo != '') {
							//alert('anexo: ' + checklist_secoes[i].anexo);
							var File_Name = checklist_secoes[i].anexo;
							// aqui tem que fazer o download da imagem e gravar no fs 
							var rootdir = fs.root;
							var fp = fs.root.nativeURL 
							fp = fp + "/anexo/" + File_Name;
							var download_link = 'http://gnrx.com.br/imagensanexas/' + File_Name;
							filetransfer(download_link, fp);
						}
						// em vez de inserir vazio, deve inserir null 
						var sql = "INSERT INTO checklist_gui (token, codigooriginal, descricao, secaopai, tipo, datalimite, ordenacao, entidade, codigo, atualizouservidor, imagemanexa) VALUES ('"+$rootScope.tokenGlobal+"','"+checklist_secoes[i].codigo+"','"+checklist_secoes[i].descricao+"','"+checklist_secoes[i].secaopai+"','"+checklist_secoes[i].tipo+"','"+checklist_secoes[i].datalimite+"','"+checklist_secoes[i].ordenacao+"',"+entidade+",'" + checklist_secoes[i].codigo + "',1,'"+checklist_secoes[i].anexo+"')";
						tx.executeSql(sql,[], function(tx, res) {
							$scope.conta_atualizando = cont;
							cont++;
						
							if (cont == checklist_secoes.length - 1) {
								$scope.atualizando = false;
								$scope.MeuNavigator.pushPage('escolhechecklist.html', {secaoPai: [], animation: 'slide'});	
							}
							$scope.$apply();
						}, function(dados, erro) {
							console.log(JSON.stringify(erro.message));
						});
					}
				}, function(dados, erro) {
							console.log(JSON.stringify(erro.message));

					}
				);	
					
			});
		};
		
		function fail(error) {
			alert('erro: ' + JSON.stringify(error));
		}

	});
	
	// CONFIG Controller *********************************************************
	// *******************************************************************************
    app.controller('ConfigController', function($scope, $rootScope, $http, transformRequestAsFormPost, FotoService ) {
		$scope.token = $rootScope.tokenGlobal
		var checklist_secoes = [];
		$scope.conta_atualizando = 0;
		$scope.conta_atualizando_servidor = 0;
		$scope.conta_atualizando_fotos_servidor = 0;
		$scope.total_para_servidor = 0;
		$scope.total_fotos_para_servidor = 0;
		
		$scope.totalitens = 0;
		$scope.totalrespondidos = 0;
		$scope.totalconforme = 0;
		$scope.totalnaoconforme = 0;
		$scope.totalnaoseaplica = 0;
		
		$scope.nomechecklist = $rootScope.nomechecklist;
		var page = MeuNavigator.getCurrentPage();
		$scope.secaoPai = page.options.secaoPai;
		$scope.secaoAvo = page.options.secaoAvo;
		var codigo = $scope.secaoPai.codigo;
		$rootScope.MeuNavigator = $scope.MeuNavigator;
		$rootScope.secaoPai = $scope.secaoPai;
		$rootScope.secaoAvo = page.options.secaoAvo;

		var entidade = 0;
		
		if ($scope.secaoPai.entidade != undefined && $scope.secaoPai.entidade != '') {
			entidade = $scope.secaoPai.entidade;
		}
			

	    var fs;
		window.requestFileSystem(PERSISTENT, 0, 
			function(fileSystem) {	fs = fileSystem	}
			, fail);
			
		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
		
		// PEGA FOTO SECAO	
		db.transaction(function(tx) {
			tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_fotos (token text, codigo text, nome text, obs text, entidade int, atualizouservidor int)');
			tx.executeSql("select nome from checklist_fotos where token = ? and codigo = ? and ifnull(entidade,0)=? ", [$scope.token, $scope.secaoPai.codigo, entidade], function(tx, results) {
					if (results.rows.length > 0) {
						$scope.fotosecao = fs.root.nativeURL + results.rows.item(0).nome;
						$scope.$apply();
					}
				}, function(a, b) {
					 alert(b.message);
				}
					
			);
		});
			
		// TIRA FOTO
		$scope.tirafotosecao = function()	{
			FotoService.tirafoto('', codigo, entidade);
		}		
		
		// CLONA SECAO	
		$scope.clonasecao = function() {
				var result = confirm('Confirma clonagem da seção ' + $scope.secaoPai.descricao + 'e suas subseções?');
				if (result ){	
					ons.notification.prompt({
					  message: "Nome da nova entidade:",
					  callback: function(nome) {
						  clonasecao_acao(nome);
					  }
					});
				}
			}
		
		function clonasecao_acao(nome) {
			var codigo_raiz = $scope.secaoPai.codigo;
			var codigo_raiz_original = $scope.secaoPai.codigooriginal;
			
			db.transaction(function(tx) {
				tx.executeSql("select max(ifnull(entidade,0)) as entidade from checklist_gui where token=? and codigooriginal = ? ", [$scope.token, $scope.secaoPai.codigooriginal], function(tx, results) {
					var prox_entidade = results.rows.item(0).entidade + 1;
					var codigo_raiz_novo = codigo_raiz + 'e' + prox_entidade;
					
					var sql1 = "insert into checklist_gui (token, codigooriginal, descricao, secaopai, tipo, entidade, ordenacao, codigo) select token, codigooriginal, descricao || ' [e" + prox_entidade + "] " + nome + "', secaopai, tipo, " + prox_entidade + ", ordenacao, '" + codigo_raiz_novo + "' from checklist_gui cg where token=? and codigo =? ";

					var sql2 = "insert into checklist_gui (token, codigooriginal, descricao, secaopai, tipo, entidade, ordenacao, codigo) select token, codigooriginal, descricao, replace(secaopai, '" + codigo_raiz + "', '" + codigo_raiz_novo + "'), tipo, entidade, ordenacao, replace(codigo, '" + codigo_raiz + "', '" + codigo_raiz_novo + "')   from checklist_gui cg where token = ? and codigo like ? ";


					
					tx.executeSql(sql1, [$rootScope.tokenGlobal, $scope.secaoPai.codigo], function(tx, res) {
						console.log('inserindo secao pai ' + $scope.secaoPai.codigo);
						VoltaSecaoAvo();
					}, function(a,b) {
						alert(b.message)
					}
					);
					
					tx.executeSql(sql2, [$rootScope.tokenGlobal, $scope.secaoPai.codigo + '.%'], function(tx, res) {
						console.log('inserindo secoes filhas de ' + $scope.secaoPai.codigo);
					}, function(a,b) {
						alert(b.message)
					}
					);				

				},
				function(a,b) {
					alert(b.message);
				}
				);
			});			
		}
		
		$scope.AtualizaBanco = function() {
			puxabanco();
		}

		function VoltaSecaoAvo() {
			$scope.MeuNavigator.popPage({onTransitionEnd : function() {
				$scope.MeuNavigator.popPage({onTransitionEnd : function() {
					$scope.MeuNavigator.replacePage('secoes.html', {secaoPai: $rootScope.secaoAvo, animation : 'none' } );
				}})
			}})			
		}
		
		$scope.VoltaTopo = function(index) {
			$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'});

		}
		
		$scope.entraescolha = function(index) {
			$scope.MeuNavigator.pushPage('escolhechecklist.html',{secaoPai: '', animation: 'slide'})
		}
		
		// APAGA SEÇÃO
		$scope.apagachecklist = function(index) {
				var result = confirm('Confirma exlusão da seção ' + $scope.secaoPai.descricao + ', suas subseções, fotos e informações?');
				if (result ){
 						db.transaction(function(tx) {
							tx.executeSql('DELETE FROM  checklist_gui WHERE token = ? and codigo=? ',[$rootScope.tokenGlobal, codigo]);
							tx.executeSql('DELETE FROM  checklist_gui WHERE token = ? and codigo like ? ',[$rootScope.tokenGlobal, codigo + '.%']);
							tx.executeSql('DELETE FROM  checklist_fotos WHERE token = ? and codigo like ? ',[$rootScope.tokenGlobal, codigo + '.%']);
						});
						var a=1;
 					//$scope.MeuNavigator.pushPage('escolhechecklist.html',{secaoPai: '', animation: 'slide'});
 
					//pegasecoes(codigo, entidade, 'deletar');
					//apagaItensSecao(codigo, entidade)
					VoltaSecaoAvo();
				}

		}

		// APAGA FOTO
		$scope.apagafotosecao = function() {
			var result = confirm('deseja apagar a foto?');
			if (result) {
				var nomearquivo = $scope.fotosecao.split('/').pop();
				var root = fs.root;
				root.getFile(nomearquivo, {create: false}, apagafoto_acao, null); 
				db.transaction(function(tx) {
						tx.executeSql("DELETE from checklist_fotos where token=? and codigo=? and nome=?", [$rootScope.tokenGlobal, $scope.secaoPai.codigo, nomearquivo], function(tx, res) {
							$rootScope.tevealteracaoitem = true;
							$scope.fotosecao = '';
							$scope.$apply();
						});
				});		
			}
		}
		
		// APAGA FOTO_ACAO
		function apagafoto_acao(fileEntry) {
			fileEntry.remove(null, null);
		}

		// CONTA REGISTROS *** DESATUALIZADO SEM USO (SUBSTITUIDO PELO PEGASECOES E CONTAITENSSECAO
		//contaregistrosbanco();
		function contaregistrosbanco() {
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_gui (token text, codigo text, descricao text, secaopai text, tipo text, conforme text, obs text, latitude text, longitude text,datalimite text, entidade int, ordenacao text, codigooriginal text, atualizouservidor int, imagemanexa text)');

					tx.executeSql("select count(1) totalitens,  sum(case when conforme is not null then 1 else 0 end) totalrespondidos,  sum(case conforme when 'sim' then 1 else 0 end) totalconforme,   sum(case conforme when 'nao' then 1 else 0 end) totalnaoconforme ,   sum(case conforme when 'nao se aplica' then 1 else 0 end) totalnaoseaplica, sum(case ifnull(atualizouservidor,0) when 0 then 1 else 0 end) totalparaatualizar, sum(case ifnull(atualizouservidor,0) when 0 then 1 else 0 end) totalparaatualizar, (select sum(case ifnull(atualizouservidor,0) when 0 then 1 else 0 end) from checklist_fotos where codigo = cg.codigo) totalfotosparaatualizar from checklist_gui cg where token=? and codigo like ? and tipo='item' ", [$scope.token, $scope.secaoPai.codigo + '.%'], function(tx, results) {
						
					$scope.totalitens = results.rows.item(0).totalitens;
					$scope.totalrespondidos = results.rows.item(0).totalrespondidos;
					$scope.totalconforme = results.rows.item(0).totalconforme;
					$scope.totalnaoconforme = results.rows.item(0).totalnaoconforme;
					$scope.totalnaoseaplica = results.rows.item(0).totalnaoseaplica;
					$scope.total_para_servidor = totalparaatualizar;
					$scope.total_fotos_para_servidor = totalfotosparaatualizar;
					$scope.$apply();
				},
				function(a,b) {
					alert(b.message);
				}
				);
			});
		};



		
		function apagaItensSecao(codigopai) {
			db.transaction(function(tx) {
				// apaga a propria secao
				tx.executeSql("DELETE FROM  checklist_gui WHERE token = ? and codigo=?  and tipo='secao'",[$rootScope.tokenGlobal, codigopai], 	function(tx, results) {
						alert('deletei secao codigo ' + codigopai );
					},
					function(a,b) {
						alert(b.message);
					}
				);
				// apaga os itens da secao
				tx.executeSql("DELETE FROM  checklist_gui WHERE token = ? and secaopai=?  and tipo='item'",[$rootScope.tokenGlobal, codigopai],
					function(tx, results) {
						alert('deletei itens secaopai= ' + codigopai );
					},
					function(a,b) {
						alert(b.message);
					}
				);
				// apaga as fotos dos itens da secao
				tx.executeSql("DELETE FROM  checklist_fotos WHERE token = ? and codigo like ? ",[$rootScope.tokenGlobal, codigopai + '.%']);
			});
		};		

		contaItensHierarquia(codigo);
		// CONTA ITENS
		function contaItensHierarquia(codigo) {
			db.transaction(function(tx) {
		tx.executeSql("select count(1) totalitens,  ifnull(sum(case when conforme is not null then 1 else 0 end),0) totalrespondidos,  sum(case conforme when 'sim' then 1 else 0 end) totalconforme,  sum(case conforme when 'nao' then 1 else 0 end) totalnaoconforme ,   sum(case conforme when 'nao se aplica' then 1 else 0 end) totalnaoseaplica,sum(case ifnull(atualizouservidor,0) when 0 then 1 else 0 end) totalparaatualizar, sum(case ifnull(atualizouservidor,0) when 0 then 1 else 0 end) totalparaatualizar, (select count(1) from checklist_fotos where ifnull(atualizouservidor,0) = 0 and codigo like '" + codigo + ".%') totalfotosparaatualizar  from checklist_gui cg where token=? and codigo like ? and tipo='item'", [$scope.token, codigo + '.%'],
				function(tx, results) {
					$scope.totalitens += results.rows.item(0).totalitens;
					$scope.totalrespondidos += results.rows.item(0).totalrespondidos;
					$scope.totalconforme += results.rows.item(0).totalconforme;
					$scope.totalnaoconforme += results.rows.item(0).totalnaoconforme;
					$scope.totalnaoseaplica += results.rows.item(0).totalnaoseaplica;
					$scope.total_para_servidor = results.rows.item(0).totalparaatualizar;
					$scope.total_fotos_para_servidor = results.rows.item(0).totalfotosparaatualizar;					
					$scope.$apply();
					},
				function(a,b) {
					alert(b.message);
					}
				);
			});
			
		};	

		
		// EM DESUSO
		function contaItensSecao(codigopai) {
			db.transaction(function(tx) {
				tx.executeSql("select count(1) totalitens,  ifnull(sum(case when conforme is not null then 1 else 0 end),0) totalrespondidos,  sum(case conforme when 'sim' then 1 else 0 end) totalconforme,  sum(case conforme when 'nao' then 1 else 0 end) totalnaoconforme ,   sum(case conforme when 'nao se aplica' then 1 else 0 end) totalnaoseaplica  from checklist_gui cg where token=? and secaopai=? and tipo='item' ", [$scope.token, codigopai],
				function(tx, results) {
					$scope.totalitens += results.rows.item(0).totalitens;
					$scope.totalrespondidos += results.rows.item(0).totalrespondidos;
					$scope.totalconforme += results.rows.item(0).totalconforme;
					$scope.totalnaoconforme += results.rows.item(0).totalnaoconforme;
					$scope.totalnaoseaplica += results.rows.item(0).totalnaoseaplica;
					$scope.$apply();
					},
				function(a,b) {
					alert(b.message);
					}
				);
			});
			
		};	

		
		// PEGA OUTRAS SUBSECOES E VAI NAVEGANDO NA ARVORE PRA BAIXO  EM DESUSO
		function pegasecoes(codigopai, acao) {
			db.transaction(function(tx) {
				tx.executeSql("select codigo, ifnull(entidade,0) entidade from checklist_gui cg where token=? and secaopai=? and tipo='secao' ", [$scope.token, codigopai],
				function(tx, results) {
					for (var i=0; i < results.rows.length; i++) {
						var codigosecao = results.rows.item(i).codigo;
						var entidadesecao = results.rows.item(i).entidade;
						pegasecoes(codigosecao, entidadesecao, acao);
						if (acao == 'contar') {
							contaItensSecao(codigosecao,entidadesecao);
						}
						if (acao == 'deletar') {
							apagaItensSecao(codigosecao, entidadesecao)
						}
					}
				},
				function(a,b) {
					alert(b.message);
				}
				);
			});
		};	

	
		// ATUALIZA SERVIDOR
		$scope.atualizaservidor = function() {
			//db = window.openDatabase({name: "my.db"});

			// atualiza dados itens
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_gui (token text, codigo text, descricao text, secaopai text, tipo text, conforme text, obs text, latitude text, longitude text,datalimite text, entidade int, ordenacao text, codigooriginal text, atualizouservidor int, imagemanexa text)');
				tx.executeSql("select * from checklist_gui where  ifnull(atualizouservidor,0) = 0", [],
				function(tx, results) {
						$scope.total_para_servidor = results.rows.length;
						$scope.conta_atualizando_servidor = 0
						$scope.$apply();
						for (var i=0; i < results.rows.length; i++){
							row = results.rows.item(i);
							atualizaItemServidor($rootScope.tokenGlobal, row.codigo, row.conforme, row.obs, row.latitude, row.longitude, row.tipo, row.secaopai, row.entidade, row.descricao, row.codigooriginal);
							tx.executeSql("update checklist_gui set atualizouservidor = 1 where codigo = '" + row.codigo + "'");
						}
					},
				function(a,b) {
					alert(b.message)
				}
				);
			});
		
			// SELECIONA FOTOS PARA UPDATE PARA SERVIDOR
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_fotos (token text, codigo text, nome text, obs text, entidade int, atualizouservidor int)');
				tx.executeSql("select * from checklist_fotos where ifnull(atualizouservidor,0) = 0", [], function(tx, results) {
						$scope.total_fotos_para_servidor = results.rows.length;
						$scope.conta_atualizando_fotos_servidor = 0
						$scope.$apply();
						for (var i=0; i < results.rows.length; i++){
							row = results.rows.item(i);
							var token = row.token;
							var codigo = row.codigo;
							var nome = row.nome;
							var obs = row.obs;
							var entidade = row.entidade;
							var uri_arquivo = fs.root.nativeURL + nome
							uploadFoto(uri_arquivo, token, codigo, nome, obs, entidade );
							

						}
					}
				);
			});
		
		};
	

	// ATUALIZA ITEM SERVIDOR $HTTP	
	function atualizaItemServidor(token, codigo, conforme, obs, latitude, longitude, tipo, secaopai, entidade, descricao, codigooriginal) {
		var urljson = 'http://gnrx.com.br/atualizaItemServidor.asp';
		$http({method: 'POST',
			   url: urljson,
			   transformRequest: transformRequestAsFormPost,
					data: {
						token: token,
						codigo: codigo,
						conforme: conforme,
						obs: obs,
						latitude: latitude,
						longitude: longitude,
						tipo: tipo,
						secaopai: secaopai,
						entidade: entidade,						
						descricao: descricao,
						codigooriginal: codigooriginal
					}
				}).
		success(function(data, status, headers, config) {
			//alert(JSON.stringify(data));
			$scope.conta_atualizando_servidor ++;
			//$scope.$apply();
		}).
		error(function(data, status, headers, config) {
			alert('erro no json ' +  data);
		});	
	}; 
	
	// UPLOAD FOTO FILETRANSFER
	function uploadFoto(imageURI, token, codigo, nome, obs, entidade ) {
		var options = new FileUploadOptions();
		options.fileKey="file";
		options.fileName=imageURI.substr(imageURI.lastIndexOf('/')+1);
		options.mimeType="image/jpeg";

		var params = new Object();
		params.token = token;
		params.codigo = codigo;
		params.nome = nome;
		params.obs = obs;
		params.entidade = entidade;

		options.params = params;
		options.chunkedMode = false;

		var ft = new FileTransfer();
		ft.upload(imageURI, "http://gnrx.com.br/uploadFoto.asp", win(codigo), fail, options);
	}

	// SUCESSO UPLOAD
	function win(codigo,r) {
	/* 	alert("Code = " + r.responseCode);
		alert("Response = " + r.response);
		alert("Sent = " + r.bytesSent);
		alert(r.response); */
		$scope.conta_atualizando_fotos_servidor ++;
		db.transaction(function(tx) {
			tx.executeSql("update checklist_fotos set atualizouservidor = 1 where codigo = '" + codigo + "'");
		});
		var a=1;
		$scope.$apply();		
	}

	
	function fail(error) {
		alert('erro: ' + JSON.stringify(error));
	}
		
	
	
	});	

	// ITENS Controller *********************************
	// **************************************************
    app.controller('ItensController', function($interval, $scope,  $sce, $compile, $rootScope, $http) {
		$scope.token = $rootScope.tokenGlobal;
		var page = MeuNavigator.getCurrentPage();
		$scope.secaoPai = page.options.secaoPai;
		if (page.options.secaoAvo != undefined) {
			$rootScope.secaoAvo = page.options.secaoAvo;
		}
		
		var entidade = 0;
		
		if ($scope.secaoPai.entidade != undefined && $scope.secaoPai.entidade != '') {
			entidade = $scope.secaoPai.entidade;
		}
			

		$scope.descricaoitem = $scope.secaoPai.descricao.replace("<(glo", "<a style='color: blue; text-decoration: underline;' ng-click=showglossario($event,")

		
		$scope.pega = function() {
			return 'lalala';
		}
		
		$scope.showglossario = function(e, codglo) {
			db.transaction(function(tx) {
				tx.executeSql("Select * from glossario where codigo=?", [codglo], function(tx, results) {
					$scope.termoglossario = results.rows.item(0).termo;
					$scope.descricaoglossario = results.rows.item(0).descricao;
				})
			})
			$scope.popover.show(e.target);
		};
		
		ons.createPopover('popover.html',{parentScope: $scope}).then(function(popover) {
			$scope.popover = popover;
		});
		  
		
		
		
		$scope.txtobservacao = "";
		$scope.obtendo_gps = false;
		$scope.tevealteracao = false;
		
		var PERSISTENT
		if (typeof LocalFileSystem === 'undefined') {
			PERSISTENT = window.PERSISTENT;
		} else {
			PERSISTENT = LocalFileSystem.PERSISTENT ;
		}
		

		var fs;
		window.requestFileSystem(PERSISTENT, 0, 
			function(fileSystem) {
				fs = fileSystem
			}
			, deuerro);
	
		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
		



		
		// PREENCHE ENTIDADDE FOTOS E DEMAIS CAMPOS DO ITEM
		$scope.fotos = [];
		ledados();
		function ledados() {
			$scope.fotos = [];
			db.transaction(function(tx) {
				tx.executeSql("Select * from checklist_gui where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.token, $scope.secaoPai.codigo, entidade], function(tx, results) {
					$scope.txtobservacao = results.rows.item(0).obs;
					$scope.latitude = results.rows.item(0).latitude;
					$scope.longitude = results.rows.item(0).longitude;
					$scope.conformidade = results.rows.item(0).conforme;
					
					if ($scope.txtobservacao != undefined && $scope.txtobservacao != '')
						$scope.cor_icone_obs = "#1284ff";
					else
						$scope.cor_icone_obs = "#000000";
			
					tx.executeSql("Select * from checklist_fotos where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.token, $scope.secaoPai.codigo, entidade], function(tx, results) {
						for (var i=0;i<results.rows.length;i++) {
							var fotoURL = fs.root.nativeURL + results.rows.item(i).nome;
							var foto = {url: fotoURL ,observacao: results.rows.item(i).obs};
							$scope.fotos.push(foto);
							$scope.$apply();
						};
					});	
					
					
					$scope.$apply();
				});
			});
		};
		

		// VERIFICA VALOR CONFORMIDADE
		$scope.verificavalor = function() {
			db.transaction(function(tx) {
				tx.executeSql("update checklist_gui set conforme=?, atualizouservidor = 0 where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.conformidade, $rootScope.tokenGlobal, $scope.secaoPai.codigo, entidade], function(tx, res) {
					$rootScope.tevealteracaoitem = true;
					//alert('insert conformidade ok');
				});
			});
		};
		
		
		//ACAO
		$scope.acao = function(acao, param_url, param_observacao) { 
			if (acao == 'observacao') {
				if (param_url != '') {
					var url = param_url;
				}
				var observacao = param_observacao;
				$scope.MeuNavigator.pushPage('observacao.html', {secaoPai: $scope.secaoPai, url_foto: url, observacao: observacao, animation: 'slide'});	
			}
			else if (acao == 'fotos') {
				$scope.tirafoto(0);
			}
			else if (acao == 'gps') {
				$scope.registragps();
			}
			else if (acao == 'trocarfoto') {
				var result = confirm("Deseja substituir esta foto?");
				if (result) {
					$scope.tirafoto(param_url);
				}
			}
			else if (acao == 'apagarfoto') {
				var result = confirm("Confirma deleção?");
				if (result) {
					$scope.apagafoto(param_url);
				}
			}
			else
				alert(acao);
		}

		 
		 
		$scope.VoltaTopo = function(index) {
			$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'});
		}		

		$scope.VoltaSecoes = function() {
			if ($rootScope.tevealteracaoitem) {
				$scope.MeuNavigator.popPage({onTransitionEnd : function() {
					$scope.MeuNavigator.replacePage('secoes.html', {secaoPai: $rootScope.secaoAvo, posicao: $scope.secaoPai.codigo, animation : 'none' } );
				}});	
			}
			else {
				$scope.MeuNavigator.popPage();
			}
		}
		
		// COR ICONE GPS
		$scope.cor_icone_gps = function() {
			//if (localStorage.getItem(chave_latitude) != undefined)
			if ($scope.latitude != undefined && $scope.latitude != '')
				return "#1284ff";
			else
				return "#000000";
		};
		
	
		// COR ICONE FOTO
		$scope.cor_icone_foto = function() {
			if ($scope.fotos.length > 0)
				return "#1284ff";
			else
				return "#000000";
		};	
		

		// REGISTRA GPS
		$scope.registragps = function() {
			var leugps = function(position) {
				alert('Latitude: '          + position.coords.latitude          + '\n' +
					  'Longitude: '         + position.coords.longitude         + '\n' +
					  'Altitude: '          + position.coords.altitude          + '\n' +
					  'Accuracy: '          + position.coords.accuracy          + '\n' +
					  'Altitude Accuracy: ' + position.coords.altitudeAccuracy  + '\n' +
					  'Heading: '           + position.coords.heading           + '\n' +
					  'Speed: '             + position.coords.speed             + '\n' +
					  'Timestamp: '         + position.timestamp                + '\n');

				$scope.latitude = position.coords.latitude;
				$scope.longitude = position.coords.longitude;
				$scope.obtendo_gps = false;
				$scope.$apply();
				
				db.transaction(function(tx) {
				tx.executeSql("update checklist_gui set latitude=?, longitude=?, atualizouservidor = 0 where token=? and codigo=? and ifnull(entidade,0)=?", [position.coords.latitude, position.coords.longitude, $rootScope.tokenGlobal, $scope.secaoPai.codigo, entidade], function(tx, res) {
					$rootScope.tevealteracaoitem = true;
				});
				
			});
				
			}	
			$scope.obtendo_gps = true;
			$scope.$apply();	
			navigator.geolocation.getCurrentPosition(leugps, deuerro);
		};

		// TIRA FOTO
		var imageURI;
		var URL_foto;
		$scope.tirafoto =  function(url) {
			URL_foto = url;
			navigator.camera.getPicture(tiroufoto, deuerro,
			  {
				quality: 50,
				destinationType: Camera.DestinationType.FILE_URI,
				encodingType: Camera.EncodingType.JPEG,
				targetWidth: 1024,
				correctOrientation: true

			});
		} 
		
		var tiroufoto = function( imgURI ) {
			imageURI = imgURI;
			// resolve file system for image
			window.resolveLocalFileSystemURL(imageURI, gotFileEntry, deuerro);
		}
			
		
		// MOVE A FOTO PARA O DIRETORIO PERMANENTE		
		function gotFileEntry(fileEntry) {
			fileEntry.moveTo(fs.root, fileEntry.name , fsSuccess, deuerro);
		}

		var fsSuccess = function(arquivo) {
			if (URL_foto != '') {
				var nome_foto = URL_foto.split('/').pop();
				// APAGA FOTO ANTIGA E ATUALIZA O BANCO POIS ESTA TROCANDO A FOTO
				fs.root.getFile(nome_foto, {create: false}, apagafoto_gui , null); 
				
				function apagafoto_gui(filee) {
					filee.remove(apagasucesso, deuerro);
				}
				
				function apagasucesso() {
					//alert('apaguei a foto');
				}
				
				db.transaction(function(tx) {
					tx.executeSql("update checklist_fotos set nome =?, atualizouservidor = 0 where token=? and codigo=? and nome=?", [arquivo.name, $rootScope.tokenGlobal, $scope.secaoPai.codigo, nome_foto], function(tx, res) {
						$rootScope.tevealteracaoitem = true;
						ledados();
					});
				});
			}
			else {
				db.transaction(function(tx) {
					tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_fotos (token text, codigo text, nome text, obs text, entidade int, atualizouservidor int)');
					tx.executeSql("INSERT INTO checklist_fotos (token, codigo, nome, entidade) VALUES (?,?,?,?)", [$rootScope.tokenGlobal, $scope.secaoPai.codigo, arquivo.name, entidade], function(tx, res) {
						$rootScope.tevealteracaoitem = true;
						ledados();
					});
				});
			}
			console.log("gravou " + arquivo.name + " - " + arquivo.fullPath);
		}
		
		var deuerro = function(error) {
			alert("Erro código: " + error.code);
			$scope.obtendo_gps = false;
			$scope.$apply();	
		};	

		// APAGA FOTO
		$scope.apagafoto = function(urlfoto) {
			var nomearquivo = urlfoto.split('/').pop();
			var root = fs.root;
			root.getFile(nomearquivo, {create: false}, apagafoto_acao, null); 
			db.transaction(function(tx) {
					tx.executeSql("DELETE from checklist_fotos where token=? and codigo=? and nome=?", [$rootScope.tokenGlobal, $scope.secaoPai.codigo, nomearquivo], function(tx, res) {
						$rootScope.tevealteracaoitem = true;
						ledados();
					});
			});			
		}
		
		// APAGA FOTO_ACAO
		function apagafoto_acao(fileEntry) {
			fileEntry.remove(null, null);
		}

		
    });

	
	// OBSERVACAO Controller *********************************************************
	// *******************************************************************************
    app.controller('ObservacaoController', function($interval, $scope, $rootScope, $http) {
		$scope.token = $rootScope.tokenGlobal
		var page = MeuNavigator.getCurrentPage();
		$scope.secaoPai = page.options.secaoPai;
		$scope.url_foto = page.options.url_foto;
		$scope.observacao = page.options.observacao;


		var entidade = 0;
		
		if ($scope.secaoPai.entidade != undefined && $scope.secaoPai.entidade != '') {
			entidade = $scope.secaoPai.entidade;
		}
			
		var entidadeb = entidade;
		
		

		var recognizing;
		var recognition = new SpeechRecognition();
		recognition.continuous = false;
		recognition.maxAlternatives = 1;
		recognition.lang = 'pt-BR'
		reset();
		recognition.onend = reset;

		
		$scope.reseta = function () {
			recognition = new SpeechRecognition();
			recognition.continuous = false;
			recognition.maxAlternatives = 1;
			recognition.lang = 'pt-BR'
			recognition.onend = reset;
			alert('reiniciado');
		}		
		
		
		recognition.onerror = function (event, a, b) {
			alert(JSON.stringify(event));
			alert(JSON.stringify(a));
			alert(JSON.stringify(b));
		}
			
			
		recognition.onresult = function (event) {
			var result = event.results[0][0].transcript;
			if ($scope.observacao == '' || $scope.observacao == undefined)
				$scope.observacao = result;
			else 
				$scope.observacao = $scope.observacao + ' ' + result;
			$scope.$apply();
		}

		function reset() {
		  recognizing = false;
		  $scope.ouvindo = false;
		}

		$scope.PararDitado = function() {
			recognition.stop();
			reset();
		  } 
		
		$scope.Ditar = function() { 
		/* 	recognition = undefined;
			recognition = new SpeechRecognition();
			recognition.continuous = false;
			recognition.maxAlternatives = 1;
			recognition.lang = 'pt-BR'
			recognition.onend = reset; */
			
			recognition.start();
			recognizing = true;
			$scope.ouvindo = true;
		}
		
	
		$scope.recognizeSpeech = function () {
			var maxMatches = 1;
			var promptString = "Comece a falar, para terminar clique no botão vermelho ou fique em silêncio."; // optional
			var language = "pt-BR";                     // optional
			window.plugins.speechrecognizer.startRecognize(function(result){
				if ($scope.observacao == '' || $scope.observacao == undefined)
						$scope.observacao = result;
				else 
					$scope.observacao = $scope.observacao + ' ' + result;
				$scope.$apply();
			}, function(errorMessage){
				console.log("Erro no reconhecimento de voz, por favor, tente novamente: " + errorMessage);
			}, maxMatches, promptString, language);
		}

	
		// Show the list of the supported languages
		$scope.getSupportedLanguages =  function () {
			window.plugins.speechrecognizer.getSupportedLanguages(function(languages){
				// display the json array
				alert(languages);
			}, function(error){
				alert("Could not retrieve the supported languages : " + error);
			});
		}
			
	var nome_foto = '';
	
	var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);

	$scope.gravaobservacao = function() {
		if ($scope.url_foto == undefined) {
			// observacao geral do item
			db.transaction(function(tx) {
				tx.executeSql("update checklist_gui set obs=?, atualizouservidor = 0 where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.observacao, $rootScope.tokenGlobal, $scope.secaoPai.codigo, entidade], function(tx, res) {
					$rootScope.tevealteracaoitem = true;
				});
			
			});
		}
		else {
			// observacao da foto
			nome_foto = $scope.url_foto.split('/').pop();
			db.transaction(function(tx) {
				tx.executeSql("update checklist_fotos set obs=? where token=? and codigo=? and nome=?", [$scope.observacao, $rootScope.tokenGlobal, $scope.secaoPai.codigo, nome_foto], function(tx, res) {
					$rootScope.tevealteracaoitem = true;
				});
			});
		}
		
		//$scope.MeuNavigator.replacePage('itens.html', {secaoPai: $scope.secaoPai, animation : 'none' } );

		$scope.MeuNavigator.popPage({onTransitionEnd : function() {
			$scope.MeuNavigator.replacePage('itens.html', {secaoPai: $scope.secaoPai, animation : 'none' } );
		}
		});
	}
	 
	$scope.VoltaTopo = function(index) {
		$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'});
	}
	
    });

	
//    FACTORY FOTOSERVICE
app.factory('FotoService', function($rootScope) {
	return {
		tirafoto: function(url, codigo, entidade) {
			var URL_foto = url;
			var imageURI;
			
			var PERSISTENT
			if (typeof LocalFileSystem === 'undefined') {
				PERSISTENT = window.PERSISTENT;
			} else {
				PERSISTENT = LocalFileSystem.PERSISTENT ;
			}
			

			var fs;
			window.requestFileSystem(PERSISTENT, 0, 
				function(fileSystem) {
					fs = fileSystem
				}
				, deuerro);
		
			var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
		
		
			navigator.camera.getPicture(tiroufoto, deuerro,
			  {
				quality: 50,
				destinationType: Camera.DestinationType.FILE_URI,
				encodingType: Camera.EncodingType.JPEG,
				targetWidth: 1024,
				correctOrientation: true

			});
			
			
			function tiroufoto(imgURI) {
				imageURI = imgURI;
				// resolve file system for image
				window.resolveLocalFileSystemURL(imageURI, gotFileEntry, deuerro);
			}


			// MOVE A FOTO PARA O DIRETORIO PERMANENTE		
			function gotFileEntry(fileEntry) {
				fileEntry.moveTo(fs.root, fileEntry.name , fsSuccess, deuerro);
			}

			// GRAVA TABELA FOTO
			function fsSuccess(arquivo) {
				if (URL_foto != '') {
					var nome_foto = URL_foto.split('/').pop();
					// APAGA FOTO ANTIGA E ATUALIZA O BANCO POIS ESTA TROCANDO A FOTO
					fs.root.getFile(nome_foto, {create: false}, apagafoto_gui , null); 
					
					function apagafoto_gui(filee) {
						filee.remove(apagasucesso, deuerro);
					}
					
					function apagasucesso() {
						//alert('apaguei a foto');
					}
					
					db.transaction(function(tx) {
						tx.executeSql("update checklist_fotos set nome =?, atualizouservidor=0 where token=? and codigo=? and nome=? and ifnull(entidade,0)=?", [arquivo.name, $rootScope.tokenGlobal, codigo, nome_foto, entidade], function(tx, res) {
							$rootScope.tevealteracaoitem = true;
							ledados();
						});
					});
				}
				else {
					db.transaction(function(tx) {
						tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_fotos (token text, codigo text, nome text, obs text, entidade int, atualizouservidor int)');
						tx.executeSql("INSERT INTO checklist_fotos (token, codigo, nome, entidade) VALUES (?,?,?,?)", [$rootScope.tokenGlobal, codigo, arquivo.name, entidade], function(tx, res) {
							$rootScope.tevealteracaoitem = true;
							//ledados();
						});
					});
				}
				console.log("gravou " + arquivo.name + " - " + arquivo.fullPath);
				//alert("gravou " + arquivo.name + " - " + arquivo.fullPath);
				//$rootScope.MeuNavigator.replacePage('config.html', {secaoPai: $rootScope.secaoPai, animation : 'none' } );
				
				$rootScope.MeuNavigator.popPage({onTransitionEnd : function() {
					$rootScope.MeuNavigator.popPage({onTransitionEnd : function() {
						$rootScope.MeuNavigator.replacePage('secoes.html', {secaoPai: $rootScope.secaoAvo, secaoAvo: {}, animation : 'none' } );
					}})
				}})
			}

			function deuerro(error) {
				alert("Erro código: " + error.code);	
			};				


	// aqui entra conteudo funcoes
	
	// termina aqui
		
		}
	}
});





// SECOES DATA FACTORY	
	
app.factory('SecoesData', function()
{ 
    var data = {
	"codigo": "18",
	"descricao": "NR 18 SEG NAS CONSTRUCOES",
	"pai": "" };

    return data;
});
	
app.factory('AboutData', function()
{ 
    var data = []
    return data;
});


app.factory("transformRequestAsFormPost", function() {
		// I prepare the request data for the form post.
		function transformRequest( data, getHeaders ) {
			var headers = getHeaders();
			headers[ "Content-type" ] = "application/x-www-form-urlencoded; charset=utf-8";
			return( serializeData( data ) );
		}
		// Return the factory value.
		return( transformRequest );
		// ---
		// PRVIATE METHODS.
		// ---
		// I serialize the given Object into a key-value pair string. This
		// method expects an object and will default to the toString() method.
		// --
		// NOTE: This is an atered version of the jQuery.param() method which
		// will serialize a data collection for Form posting.
		// --
		// https://github.com/jquery/jquery/blob/master/src/serialize.js#L45
		function serializeData( data ) {
			// If this is not an object, defer to native stringification.
			if ( ! angular.isObject( data ) ) {
				return( ( data == null ) ? "" : data.toString() );
			}
			var buffer = [];
			// Serialize each key in the object.
			for ( var name in data ) {
				if ( ! data.hasOwnProperty( name ) ) {
					continue;
				}
				var value = data[ name ];
				buffer.push(
					encodeURIComponent( name ) +
					"=" +
					encodeURIComponent( ( value == null ) ? "" : value )
				);
			}
			// Serialize the buffer and clean it up for transportation.
			var source = buffer
				.join( "&" )
				.replace( /%20/g, "+" )
			;
			return( source );
		}
	}
);

app.directive('compile', ['$compile', function ($compile) {
    return function(scope, element, attrs) {
      scope.$watch(
        function(scope) {
          // watch the 'compile' expression for changes
          return scope.$eval(attrs.compile);
        },
        function(value) {
          // when the 'compile' expression changes
          // assign it into the current DOM
          element.html(value);

          // compile the new DOM and link it to the current
          // scope.
          // NOTE: we only compile .childNodes so that
          // we don't get into infinite loop compiling ourselves
          $compile(element.contents())(scope);
        }
    );
  };
}]);


})();