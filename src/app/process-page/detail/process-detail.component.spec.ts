import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { BitstreamDataService } from '../../core/data/bitstream-data.service';
import { AuthServiceMock } from '../../shared/mocks/auth.service.mock';
import { ProcessDetailComponent } from './process-detail.component';
import {
  async,
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  flush,
  flushMicrotasks,
  TestBed,
  tick
} from '@angular/core/testing';
import { VarDirective } from '../../shared/utils/var.directive';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ProcessDetailFieldComponent } from './process-detail-field/process-detail-field.component';
import { Process } from '../processes/process.model';
import { ActivatedRoute } from '@angular/router';
import { of as observableOf } from 'rxjs';
import { By } from '@angular/platform-browser';
import { FileSizePipe } from '../../shared/utils/file-size-pipe';
import { Bitstream } from '../../core/shared/bitstream.model';
import { ProcessDataService } from '../../core/data/processes/process-data.service';
import { DSONameService } from '../../core/breadcrumbs/dso-name.service';
import { createSuccessfulRemoteDataObject, createSuccessfulRemoteDataObject$ } from '../../shared/remote-data.utils';
import { createPaginatedList } from '../../shared/testing/utils.test';

describe('ProcessDetailComponent', () => {
  let component: ProcessDetailComponent;
  let fixture: ComponentFixture<ProcessDetailComponent>;

  let processService: ProcessDataService;
  let nameService: DSONameService;
  let bitstreamDataService: BitstreamDataService;
  let httpClient: HttpClient;
  let authService: AuthService;

  let process: Process;
  let fileName: string;
  let files: Bitstream[];

  let processOutput;

  function init() {
    processOutput = 'Process Started'
    process = Object.assign(new Process(), {
      processId: 1,
      scriptName: 'script-name',
      processStatus: 'COMPLETED',
      parameters: [
        {
          name: '-f',
          value: 'file.xml'
        },
        {
          name: '-i',
          value: 'identifier'
        }
      ],
      _links: {
        self: {
          href: 'https://rest.api/processes/1'
        },
        output: {
          href: 'https://rest.api/processes/1/output'
        }
      }
    });
    fileName = 'fake-file-name';
    files = [
      Object.assign(new Bitstream(), {
        sizeBytes: 10000,
        metadata: {
          'dc.title': [
            {
              value: fileName,
              language: null
            }
          ]
        },
        _links: {
          content: { href: 'file-selflink' }
        }
      })
    ];
    const logBitstream = Object.assign(new Bitstream(), {
      id: 'output.log',
      _links: {
        content: { href: 'log-selflink' }
      }
    });
    processService = jasmine.createSpyObj('processService', {
      getFiles: createSuccessfulRemoteDataObject$(createPaginatedList(files))
    });
    bitstreamDataService = jasmine.createSpyObj('bitstreamDataService', {
      findByHref: createSuccessfulRemoteDataObject$(logBitstream)
    });
    nameService = jasmine.createSpyObj('nameService', {
      getName: fileName
    });
    httpClient = jasmine.createSpyObj('httpClient', {
      get: observableOf(processOutput)
    });
    authService = jasmine.createSpyObj('authService', {
      isAuthenticated: observableOf(true),
      setRedirectUrl: {}
    });
  }

  beforeEach(async(() => {
    init();
    TestBed.configureTestingModule({
      declarations: [ProcessDetailComponent, ProcessDetailFieldComponent, VarDirective, FileSizePipe],
      imports: [TranslateModule.forRoot(), RouterTestingModule.withRoutes([])],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { data: observableOf({ process: createSuccessfulRemoteDataObject(process) }) }
        },
        { provide: ProcessDataService, useValue: processService },
        { provide: BitstreamDataService, useValue: bitstreamDataService },
        { provide: DSONameService, useValue: nameService },
        { provide: AuthService, useValue: new AuthServiceMock() },
        { provide: HttpClient, useValue: httpClient },
        { provide: AuthService, useValue: authService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProcessDetailComponent);
    component = fixture.componentInstance;
  });
  afterEach(fakeAsync(() => {
    TestBed.resetTestingModule();
    fixture.destroy();
    flush();
    flushMicrotasks();
    discardPeriodicTasks();
    component = null;
  }));

  it('should display the script\'s name', () => {
    fixture.detectChanges();
    const name = fixture.debugElement.query(By.css('#process-name')).nativeElement;
    expect(name.textContent).toContain(process.scriptName);
  });

  it('should display the process\'s parameters', () => {
    fixture.detectChanges();
    const args = fixture.debugElement.query(By.css('#process-arguments')).nativeElement;
    process.parameters.forEach((param) => {
      expect(args.textContent).toContain(`${param.name} ${param.value}`)
    });
  });

  it('should display the process\'s output files', () => {
    fixture.detectChanges();
    const processFiles = fixture.debugElement.query(By.css('#process-files')).nativeElement;
    expect(processFiles.textContent).toContain(fileName);
  });

  describe('if press show output logs', () => {
    beforeEach(fakeAsync(() => {
      spyOn(component, 'showProcessOutputLogs').and.callThrough();
      fixture.detectChanges();

      const showOutputButton = fixture.debugElement.query(By.css('#showOutputButton'));
      showOutputButton.triggerEventHandler('click', {
        preventDefault: () => {/**/
        }
      });
      tick();
    }));
    it('should trigger showProcessOutputLogs', () => {
      expect(component.showProcessOutputLogs).toHaveBeenCalled();
    });
    it('should display the process\'s output logs', () => {
      fixture.detectChanges();
      const outputProcess = fixture.debugElement.query(By.css('#process-output pre'));
      expect(outputProcess.nativeElement.textContent).toContain(processOutput);
    });
  });

  describe('if press show output logs and process has no output logs', () => {
    beforeEach(fakeAsync(() => {
      jasmine.getEnv().allowRespy(true);
      spyOn(httpClient, 'get').and.returnValue(observableOf(null));
      fixture = TestBed.createComponent(ProcessDetailComponent);
      component = fixture.componentInstance;
      spyOn(component, 'showProcessOutputLogs').and.callThrough();
      fixture.detectChanges();
      const showOutputButton = fixture.debugElement.query(By.css('#showOutputButton'));
      showOutputButton.triggerEventHandler('click', {
        preventDefault: () => {/**/
        }
      });
      tick();
      fixture.detectChanges();
    }));
    it('should not display the process\'s output logs', () => {
      const outputProcess = fixture.debugElement.query(By.css('#process-output pre'));
      expect(outputProcess).toBeNull();
    });
    it('should display message saying there are no output logs', () => {
      const noOutputProcess = fixture.debugElement.query(By.css('#no-output-logs-message')).nativeElement;
      expect(noOutputProcess).toBeDefined();
    });
  });

});
