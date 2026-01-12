import { Injectable, Inject } from '@nestjs/common';
import { MatchState } from '../../../domain';
import { ActionFilterStrategy } from './action-filter-strategy.interface';
import { DefaultActionFilter } from './default-action-filter';

/**
 * Action Filter Registry
 * Manages and selects the appropriate action filter based on match state
 */
@Injectable()
export class ActionFilterRegistry {
  private readonly defaultFilter: ActionFilterStrategy;

  constructor(
    @Inject('ACTION_FILTERS')
    private readonly filters: ActionFilterStrategy[],
    defaultActionFilter: DefaultActionFilter,
  ) {
    this.defaultFilter = defaultActionFilter;
  }

  /**
   * Get the appropriate filter for the given match state
   */
  getFilter(matchState: MatchState): ActionFilterStrategy {
    const filter = this.filters.find((f) => f.canHandle(matchState));
    return filter || this.defaultFilter;
  }
}
