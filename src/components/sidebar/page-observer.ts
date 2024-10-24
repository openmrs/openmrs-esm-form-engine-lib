import { BehaviorSubject } from 'rxjs';
import { type FormPage } from '../../types';

class PageObserver {
  private scrollablePagesSubject = new BehaviorSubject<Array<FormPage>>([]);
  private pagesWithErrorsSubject = new BehaviorSubject<Set<string>>(new Set());
  private activePagesSubject = new BehaviorSubject<Set<string>>(new Set());
  private currentActivePageSubject = new BehaviorSubject<string | null>(null);
  private evaluatedPagesVisibilitySubject = new BehaviorSubject<boolean>(null);

  setCurrentActivePage(page: string) {
    this.currentActivePageSubject.next(page);
  }

  setEvaluatedPagesVisibility(evaluatedPagesVisibility: boolean) {
    this.evaluatedPagesVisibilitySubject.next(evaluatedPagesVisibility);
  }

  updateScrollablePages(newPages: Array<FormPage>) {
    this.scrollablePagesSubject.next(newPages);
  }

  updatePagesWithErrors(newErrors: string[]) {
    this.pagesWithErrorsSubject.next(new Set(newErrors));
  }

  addActivePage(pageId: string) {
    const currentActivePages = this.activePagesSubject.value;
    currentActivePages.add(pageId);
    this.activePagesSubject.next(currentActivePages);
  }

  removeInactivePage(pageId: string) {
    const currentActivePages = this.activePagesSubject.value;
    currentActivePages.delete(pageId);
    this.activePagesSubject.next(currentActivePages);
  }

  getActivePagesObservable() {
    return this.activePagesSubject.asObservable();
  }

  getScrollablePagesObservable() {
    return this.scrollablePagesSubject.asObservable();
  }

  getPagesWithErrorsObservable() {
    return this.pagesWithErrorsSubject.asObservable();
  }

  getCurrentActivePageObservable() {
    return this.currentActivePageSubject.asObservable();
  }

  getEvaluatedPagesVisibilityObservable() {
    return this.evaluatedPagesVisibilitySubject.asObservable();
  }

  clear() {
    this.scrollablePagesSubject.next([]);
    this.pagesWithErrorsSubject.next(new Set());
    this.currentActivePageSubject.next(null);
    this.evaluatedPagesVisibilitySubject.next(false);
  }
}

export const pageObserver = new PageObserver();
